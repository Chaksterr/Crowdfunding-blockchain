// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Project.sol";

/// @title Crowdfunding : fabrique de campagnes
/// @notice Crée des Project et garde leur liste pour l'interface web.
contract Crowdfunding {
    Project[] public projects;

    event ProjectCreated(
        address indexed project,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );

    /// @dev msg.sender devient le créateur de la campagne (pas la fabrique).
    function createProject(
        string calldata title,
        string calldata description,
        uint256 goal,
        uint256 minContribution,
        uint256 duration
    ) external returns (address) {
        Project p = new Project(msg.sender, title, description, goal, minContribution, duration);
        projects.push(p);
        emit ProjectCreated(address(p), msg.sender, title, goal, p.deadline());
        return address(p);
    }

    function getProjects() external view returns (Project[] memory) {
        return projects;
    }

    function getProjectsCount() external view returns (uint256) {
        return projects.length;
    }
}
