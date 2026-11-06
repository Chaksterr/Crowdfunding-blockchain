// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../Project.sol";

/// @notice Contrat malveillant utilisé UNIQUEMENT dans les tests.
/// Il tente de rappeler refund() pendant qu'il reçoit son remboursement
/// pour vider le Project (attaque par réentrance).
contract ReentrancyAttacker {
    Project public immutable project;
    bool public reentryAttempted;
    bool public reentrySucceeded;

    constructor(Project _project) {
        project = _project;
    }

    function donate() external payable {
        project.contribute{value: msg.value}();
    }

    function attack() external {
        project.refund();
    }

    receive() external payable {
        if (!reentryAttempted) {
            reentryAttempted = true;
            try project.refund() {
                reentrySucceeded = true;
            } catch {
                // Attendu : contribution déjà remise à zéro -> "Rien a rembourser"
            }
        }
    }
}
