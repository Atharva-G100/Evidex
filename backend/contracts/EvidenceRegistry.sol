// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenceRegistry {

    enum CustodyStatus {
        COLLECTED,
        TRANSFERRED,
        ANALYZED
    }

    struct Evidence {
        string caseId;
        string officerName;
        string ipfsCid;
        address uploader;
        uint256 timestamp;
        CustodyStatus status;
    }

    mapping(string => Evidence) private evidences;
    mapping(address => bool) private investigators;

    address public immutable owner;

    event EvidenceRegistered(
        string fileHash,
        address indexed uploader,
        uint256 timestamp,
        string ipfsCid,
        CustodyStatus status
    );

    event CustodyStatusUpdated(
        string fileHash,
        CustodyStatus status,
        uint256 timestamp
    );

    event InvestigatorUpdated(address indexed investigator, bool granted);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    modifier onlyInvestigator() {
        require(isInvestigator(msg.sender), "Caller is not investigator");
        _;
    }

    constructor() {
        owner = msg.sender;
        investigators[msg.sender] = true;
    }

    function grantInvestigator(address investigator) external onlyOwner {
        investigators[investigator] = true;
        emit InvestigatorUpdated(investigator, true);
    }

    function revokeInvestigator(address investigator) external onlyOwner {
        investigators[investigator] = false;
        emit InvestigatorUpdated(investigator, false);
    }

    function isInvestigator(address investigator) public view returns (bool) {
        return investigators[investigator];
    }

    function registerEvidence(
        string memory fileHash,
        string memory caseId,
        string memory officerName,
        string memory ipfsCid,
        CustodyStatus status
    ) public onlyInvestigator {
        require(
            evidences[fileHash].timestamp == 0,
            "Evidence already registered"
        );

        evidences[fileHash] = Evidence({
            caseId: caseId,
            officerName: officerName,
            ipfsCid: ipfsCid,
            uploader: msg.sender,
            timestamp: block.timestamp,
            status: status
        });

        emit EvidenceRegistered(fileHash, msg.sender, block.timestamp, ipfsCid, status);
    }

    function setCustodyStatus(string memory fileHash, CustodyStatus status) public onlyInvestigator {
        Evidence storage evidence = evidences[fileHash];
        require(evidence.timestamp != 0, "Evidence not registered");
        evidence.status = status;
        emit CustodyStatusUpdated(fileHash, status, block.timestamp);
    }

    function getEvidence(string memory fileHash)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            address,
            uint256,
            CustodyStatus
        )
    {
        Evidence memory e = evidences[fileHash];

        return (
            e.caseId,
            e.officerName,
            e.ipfsCid,
            e.uploader,
            e.timestamp,
            e.status
        );
    }
}
