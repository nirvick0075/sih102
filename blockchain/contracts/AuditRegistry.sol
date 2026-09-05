// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditRegistry
 * @dev Tamper-evident registry for anchoring SHA-256 hashes of MPLAD investigation reports and evidence
 */
contract AuditRegistry {
    struct AuditEntry {
        string recordId;
        string recordHash;
        uint256 timestamp;
        address registeredBy;
        bool exists;
    }

    // Mapping from recordId (e.g. "INV-DEMO-001" or "EVD-12345") to AuditEntry
    mapping(string => AuditEntry) private records;

    event RecordRegistered(
        string indexed recordId,
        string recordHash,
        uint256 timestamp,
        address indexed registeredBy
    );

    /**
     * @dev Register a new SHA-256 cryptographic hash for a record ID
     */
    function registerRecord(string memory recordId, string memory recordHash) public {
        require(bytes(recordId).length > 0, "recordId cannot be empty");
        require(bytes(recordHash).length > 0, "recordHash cannot be empty");

        records[recordId] = AuditEntry({
            recordId: recordId,
            recordHash: recordHash,
            timestamp: block.timestamp,
            registeredBy: msg.sender,
            exists: true
        });

        emit RecordRegistered(recordId, recordHash, block.timestamp, msg.sender);
    }

    /**
     * @dev Verify whether a given recordHash matches the immutable blockchain record
     */
    function verifyRecord(string memory recordId, string memory recordHash) public view returns (bool) {
        if (!records[recordId].exists) {
            return false;
        }
        return (keccak256(abi.encodePacked(records[recordId].recordHash)) == keccak256(abi.encodePacked(recordHash)));
    }

    /**
     * @dev Retrieve record details from ledger
     */
    function getRecord(string memory recordId) public view returns (string memory recordHash, uint256 timestamp, address registeredBy) {
        require(records[recordId].exists, "Record does not exist in registry");
        AuditEntry memory entry = records[recordId];
        return (entry.recordHash, entry.timestamp, entry.registeredBy);
    }
}
