import { getAddress } from 'ethers';
import { getFactory, getProject } from './contracts';
import { parseEth } from './format';
import { readProvider } from './provider';

/** Signale les campagnes illisibles sans interrompre la liste. */
function warnProjectFailure(address, error) {
  if (!import.meta.env.DEV) return;
  console.warn(
    `[projects] Lecture impossible pour ${address} :`,
    error?.shortMessage ?? error?.message ?? error,
  );
}

/**
 * Lecture d'une campagne : toutes les valeurs restent en wei (bigint) et en
 * secondes Unix. Le formatage est la responsabilité de l'interface.
 */
async function readProjectSummary(address) {
  const project = getProject(address);

  const [
    creator,
    title,
    description,
    goal,
    minContribution,
    deadline,
    totalRaised,
    status,
    donors,
    timeLeft,
  ] = await Promise.all([
    project.creator(),
    project.title(),
    project.description(),
    project.goal(),
    project.minContribution(),
    project.deadline(),
    project.totalRaised(),
    project.getStatus(),
    project.getDonors(),
    project.timeLeft(),
  ]);

  return {
    address: getAddress(address),
    creator,
    title,
    description,
    goal,
    minContribution,
    deadline,
    totalRaised,
    status: Number(status), // uint8 : 0, 1 ou 2
    donors, // adresses brutes, la liste détaillée est construite par loadProject
    timeLeft,
  };
}

/**
 * Liste toutes les campagnes de la fabrique. Une campagne illisible est
 * ignorée et comptée dans `failed` au lieu de faire échouer la liste entière.
 * @returns {Promise<{projects: Array<object>, failed: number}>}
 */
export async function loadProjects() {
  const factory = getFactory();
  const addresses = await factory.getProjects();

  const results = await Promise.allSettled(
    addresses.map((address) => readProjectSummary(address)),
  );

  const projects = [];
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      projects.push(result.value);
    } else {
      failed += 1;
      warnProjectFailure(addresses[index], result.reason);
    }
  });

  return { projects, failed };
}

/**
 * Détail complet d'une campagne : résumé, solde du contrat, donateurs triés
 * par montant décroissant, demandes de retrait et contribution du compte.
 * @param {string} address
 * @param {string|null} account adresse connectée, pour lire la contribution
 */
export async function loadProject(address, account = null) {
  const project = getProject(address);
  const summary = await readProjectSummary(address);

  const [balance, withdrawRequestsCount, contributions] = await Promise.all([
    readProvider.getBalance(summary.address),
    project.getWithdrawRequestsCount(),
    account ? project.contributions(account) : Promise.resolve(null),
  ]);

  const donors = await Promise.all(
    summary.donors.map(async (donor) => ({
      address: donor,
      amount: await project.contributions(donor),
    })),
  );

  donors.sort((a, b) => {
    if (a.amount === b.amount) return 0;
    return a.amount > b.amount ? -1 : 1;
  });

  const requestCount = Number(withdrawRequestsCount);
  const withdrawRequests = await Promise.all(
    Array.from({ length: requestCount }, async (_, id) => {
      const [amount, reason, recipient, approvals, executed] =
        await project.withdrawRequests(id);
      const hasVoted = account ? await project.hasVoted(id, account) : false;

      return {
        id,
        amount,
        reason,
        recipient,
        approvals: Number(approvals),
        executed,
        hasVoted,
      };
    }),
  );

  return {
    ...summary,
    balance,
    contributions,
    donors,
    withdrawRequestsCount: requestCount,
    withdrawRequests,
  };
}

/**
 * Crée une campagne et renvoie son adresse (lue dans ProjectCreated).
 * @param {{ title: string, description: string, goalEth: string|number,
 *           minContributionEth: string|number, durationMinutes: number|string }} input
 * @param {import('ethers').Signer} signer
 */
export async function createProject(
  { title, description, goalEth, minContributionEth, durationMinutes },
  signer,
) {
  if (!signer) {
    throw new Error(
      'Un portefeuille connecté est nécessaire pour créer une campagne.',
    );
  }

  const goal = parseEth(goalEth);
  const minContribution = parseEth(minContributionEth);
  const duration = Math.round(Number(durationMinutes) * 60);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('La durée doit être supérieure à 0.');
  }

  const factory = getFactory(signer);
  const transaction = await factory.createProject(
    title,
    description,
    goal,
    minContribution,
    duration,
  );
  const receipt = await transaction.wait();

  if (!receipt) {
    throw new Error("La transaction n'a pas été confirmée. Réessayez.");
  }

  const created = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null; // log d'un autre contrat (la campagne elle-même)
      }
    })
    .find((entry) => entry?.name === 'ProjectCreated');

  if (!created) {
    throw new Error(
      "La campagne a été créée, mais son adresse n'a pas pu être lue. Retrouvez-la dans la liste des campagnes.",
    );
  }

  return created.args.project;
}

/**
 * Envoie un don à une campagne.
 * @param {string} address
 * @param {string|number} amountEth
 * @param {import('ethers').Signer} signer
 */
export async function donate(address, amountEth, signer) {
  if (!signer) {
    throw new Error('Un portefeuille connecté est nécessaire pour donner.');
  }

  const value = parseEth(amountEth);
  if (value <= 0n) {
    throw new Error('Le montant doit être supérieur à 0.');
  }

  const project = getProject(address, signer);
  const transaction = await project.contribute({ value });

  return transaction.wait();
}

/**
 * Crée une demande de retrait (créateur, campagne réussie).
 * @param {string} address
 * @param {{ amountEth: string|number, reason: string, recipient: string }} input
 * @param {import('ethers').Signer} signer
 */
export async function createWithdrawRequest(
  address,
  { amountEth, reason, recipient },
  signer,
) {
  if (!signer) {
    throw new Error(
      'Un portefeuille connecté est nécessaire pour demander un retrait.',
    );
  }

  const amount = parseEth(amountEth);
  if (amount <= 0n) {
    throw new Error('Le montant doit être supérieur à 0.');
  }

  const trimmedReason = String(reason ?? '').trim();
  if (trimmedReason.length < 3) {
    throw new Error('Le motif doit contenir au moins 3 caractères.');
  }

  let recipientAddress;
  try {
    recipientAddress = getAddress(String(recipient ?? '').trim());
  } catch {
    throw new Error('Adresse du destinataire invalide.');
  }

  const project = getProject(address, signer);
  const transaction = await project.createWithdrawRequest(
    amount,
    trimmedReason,
    recipientAddress,
  );

  return transaction.wait();
}

/** Vote pour une demande de retrait. */
export async function voteWithdrawRequest(address, id, signer) {
  if (!signer) {
    throw new Error('Un portefeuille connecté est nécessaire pour voter.');
  }

  const project = getProject(address, signer);
  const transaction = await project.voteWithdrawRequest(id);

  return transaction.wait();
}

/** Exécute une demande de retrait approuvée (créateur). */
export async function withdrawRequestedAmount(address, id, signer) {
  if (!signer) {
    throw new Error('Un portefeuille connecté est nécessaire pour retirer.');
  }

  const project = getProject(address, signer);
  const transaction = await project.withdrawRequestedAmount(id);

  return transaction.wait();
}

/** Rembourse la contribution du compte connecté (campagne échouée). */
export async function refund(address, signer) {
  if (!signer) {
    throw new Error(
      'Un portefeuille connecté est nécessaire pour être remboursé.',
    );
  }

  const project = getProject(address, signer);
  const transaction = await project.refund();

  return transaction.wait();
}
