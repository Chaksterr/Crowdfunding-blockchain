// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../Project.sol";

/// @notice Contrat utilisé UNIQUEMENT dans les tests : il refuse tout ETH reçu
/// (pas de receive/fallback). Sert à vérifier que Project annule l'opération
/// quand un virement échoue, au lieu de perdre les fonds.
contract RejectingReceiver {
    function donate(Project project) external payable {
        project.contribute{value: msg.value}();
    }

    function claimRefund(Project project) external {
        project.refund();
    }
}
