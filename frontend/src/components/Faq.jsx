import { useState } from 'react';

/**
 * FAQ compacte, fermée par défaut. Les réponses ne décrivent que des
 * règles vérifiables du fonctionnement des campagnes (pas de promesse
 * inventée sur la chaîne).
 */
const QUESTIONS = [
  {
    id: 'fonds',
    question: 'Quand les fonds sont-ils libérés ?',
    answer:
      "Les dons restent verrouillés dans le contrat jusqu'à la date limite. Après cette date, si l'objectif est atteint, les fonds ne sont débloqués qu'après un vote favorable des donateurs sur une demande de retrait du créateur.",
  },
  {
    id: 'objectif',
    question: "Que se passe-t-il si l'objectif n'est pas atteint ?",
    answer:
      "La campagne est marquée comme échouée et chaque donateur peut récupérer sa contribution. Aucun retrait vers le créateur n'est alors possible.",
  },
  {
    id: 'vote',
    question: 'Comment les donateurs votent-ils sur les demandes de retrait ?',
    answer:
      "Le créateur soumet une demande de retrait avec un montant, un motif et une adresse de destinataire. Chaque donateur dispose d'une voix, et la demande est exécutée lorsque la moitié des donateurs l'a approuvée.",
  },
  {
    id: 'reseau',
    question: 'Sur quel réseau la campagne est-elle enregistrée ?',
    answer:
      "Sur le réseau local Hardhat (chaîne 31337). Aucun fonds réel n'est en jeu et aucun explorateur public ne peut afficher ces transactions.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2 className="px-5 pt-5 text-lg font-semibold tracking-tight text-slate-900 sm:px-6 sm:pt-6">
        Questions fréquentes
      </h2>

      <div className="divide-y divide-slate-100 px-5 pb-2 sm:px-6">
        {QUESTIONS.map((item) => {
          const isOpen = open === item.id;
          return (
            <div key={item.id}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-${item.id}`}
                  className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-slate-800 transition hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <span>{item.question}</span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </h3>
              {isOpen ? (
                <p
                  id={`faq-${item.id}`}
                  className="pb-4 pr-8 text-sm leading-relaxed text-slate-600"
                >
                  {item.answer}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
