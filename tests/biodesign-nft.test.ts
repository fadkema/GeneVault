import { describe, it, expect, beforeEach } from "vitest";

interface MockContract {
	admin: string;
	paused: boolean;
	tokenCounter: bigint;
	tokenOwners: Map<bigint, string>;
	tokenMetadata: Map<
		bigint,
		{
			uri: string;
			description: string;
			license: string;
			version: bigint;
			frozen: boolean;
		}
	>;
	tokenRoyalties: Map<bigint, { recipient: string; percentage: bigint }>;
	approvals: Map<bigint, string>;
	ownerTokenCount: Map<string, bigint>;
	ownerTokens: Map<string, { tokens: bigint[] }>;
	MAX_SUPPLY: bigint;

	isAdmin(caller: string): boolean;
	setPaused(
		caller: string,
		pause: boolean
	): { value: boolean } | { error: number };
	mint(
		caller: string,
		uri: string,
		description: string,
		license: string,
		royaltyRecipient: string,
		royaltyPercentage: bigint
	): { value: bigint } | { error: number };
	transfer(
		caller: string,
		tokenId: bigint,
		recipient: string
	): { value: boolean } | { error: number };
	approve(
		caller: string,
		tokenId: bigint,
		operator: string
	): { value: boolean } | { error: number };
	revokeApproval(
		caller: string,
		tokenId: bigint
	): { value: boolean } | { error: number };
	burn(caller: string, tokenId: bigint): { value: Boolean } | { error: number };
	updateMetadata(
		caller: string,
		tokenId: bigint,
		newUri: string,
		newDescription: string,
		newLicense: string
	): { value: boolean } | { error: number };
	freezeMetadata(
		caller: string,
		tokenId: bigint
	): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
	admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	paused: false,
	tokenCounter: 0n,
	tokenOwners: new Map(),
	tokenMetadata: new Map(),
	tokenRoyalties: new Map(),
	approvals: new Map(),
	ownerTokenCount: new Map(),
	ownerTokens: new Map(),
	MAX_SUPPLY: 1_000_000n,

	isAdmin(caller: string) {
		return caller === this.admin;
	},

	setPaused(caller: string, pause: boolean) {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.paused = pause;
		return { value: pause };
	},

	mint(
		caller: string,
		uri: string,
		description: string,
		license: string,
		royaltyRecipient: string,
		royaltyPercentage: bigint
	) {
		if (!this.isAdmin(caller)) return { error: 100 };
		const newTokenId = this.tokenCounter + 1n;
		if (newTokenId > this.MAX_SUPPLY) return { error: 107 };
		if (royaltyPercentage > 10000n) return { error: 106 };
		if (uri.length < 10 || license.length < 10) return { error: 110 };
		this.tokenOwners.set(newTokenId, caller);
		this.tokenMetadata.set(newTokenId, {
			uri,
			description,
			license,
			version: 1n,
			frozen: false,
		});
		this.tokenRoyalties.set(newTokenId, {
			recipient: royaltyRecipient,
			percentage: royaltyPercentage,
		});
		const currentCount = this.ownerTokenCount.get(caller) || 0n;
		this.ownerTokenCount.set(caller, currentCount + 1n);
		const currentTokens = this.ownerTokens.get(caller)?.tokens || [];
		this.ownerTokens.set(caller, { tokens: [...currentTokens, newTokenId] });
		this.tokenCounter = newTokenId;
		return { value: newTokenId };
	},

	transfer(caller: string, tokenId: bigint, recipient: string) {
		if (this.paused) return { error: 103 };
		const owner = this.tokenOwners.get(tokenId);
		if (!owner) return { error: 102 };
		const approved = this.approvals.get(tokenId);
		if (caller !== owner && caller !== approved) return { error: 101 };
		if (recipient === "SP000000000000000000002Q6VF78") return { error: 104 };
		this.tokenOwners.set(tokenId, recipient);
		const oldCount = this.ownerTokenCount.get(owner) || 0n;
		this.ownerTokenCount.set(owner, oldCount - 1n);
		const newCount = this.ownerTokenCount.get(recipient) || 0n;
		this.ownerTokenCount.set(recipient, newCount + 1n);
		const oldTokens = (this.ownerTokens.get(owner)?.tokens || []).filter(
			(id) => id !== tokenId
		);
		this.ownerTokens.set(owner, { tokens: oldTokens });
		const newTokens = this.ownerTokens.get(recipient)?.tokens || [];
		this.ownerTokens.set(recipient, { tokens: [...newTokens, tokenId] });
		this.approvals.delete(tokenId);
		return { value: true };
	},

	approve(caller: string, tokenId: bigint, operator: string) {
		if (this.paused) return { error: 103 };
		const owner = this.tokenOwners.get(tokenId);
		if (!owner) return { error: 102 };
		if (caller !== owner) return { error: 101 };
		if (operator === "SP000000000000000000002Q6VF78") return { error: 104 };
		if (this.approvals.has(tokenId)) return { error: 105 };
		this.approvals.set(tokenId, operator);
		return { value: true };
	},

	revokeApproval(caller: string, tokenId: bigint) {
		if (this.paused) return { error: 103 };
		const owner = this.tokenOwners.get(tokenId);
		if (!owner) return { error: 102 };
		if (caller !== owner) return { error: 101 };
		this.approvals.delete(tokenId);
		return { value: true };
	},

	burn(caller: string, tokenId: bigint) {
		if (this.paused) return { error: 103 };
		const owner = this.tokenOwners.get(tokenId);
		if (!owner) return { error: 102 };
		if (caller !== owner) return { error: 101 };
		this.tokenOwners.delete(tokenId);
		this.tokenMetadata.delete(tokenId);
		this.tokenRoyalties.delete(tokenId);
		this.approvals.delete(tokenId);
		const oldCount = this.ownerTokenCount.get(owner) || 0n;
		this.ownerTokenCount.set(owner, oldCount - 1n);
		const oldTokens = (this.ownerTokens.get(owner)?.tokens || []).filter(
			(id) => id !== tokenId
		);
		this.ownerTokens.set(owner, { tokens: oldTokens });
		return { value: true };
	},

	updateMetadata(
		caller: string,
		tokenId: bigint,
		newUri: string,
		newDescription: string,
		newLicense: string
	) {
		if (this.paused) return { error: 103 };
		const owner = this.tokenOwners.get(tokenId);
		if (!owner) return { error: 102 };
		if (caller !== owner) return { error: 101 };
		if (newUri.length < 10 || newLicense.length < 10) return { error: 110 };
		const metadata = this.tokenMetadata.get(tokenId);
		if (!metadata) return { error: 102 };
		if (metadata.frozen) return { error: 108 };
		this.tokenMetadata.set(tokenId, {
			uri: newUri,
			description: newDescription,
			license: newLicense,
			version: metadata.version + 1n,
			frozen: metadata.frozen,
		});
		return { value: true };
	},

	freezeMetadata(caller: string, tokenId: bigint) {
		if (this.paused) return { error: 103 };
		const owner = this.tokenOwners.get(tokenId);
		if (!owner) return { error: 102 };
		if (caller !== owner) return { error: 101 };
		const metadata = this.tokenMetadata.get(tokenId);
		if (!metadata) return { error: 102 };
		if (metadata.frozen) return { error: 108 };
		this.tokenMetadata.set(tokenId, { ...metadata, frozen: true });
		return { value: true };
	},
};

describe("GeneVault BioDesign NFT Contract", () => {
	beforeEach(() => {
		mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.paused = false;
		mockContract.tokenCounter = 0n;
		mockContract.tokenOwners = new Map();
		mockContract.tokenMetadata = new Map();
		mockContract.tokenRoyalties = new Map();
		mockContract.approvals = new Map();
		mockContract.ownerTokenCount = new Map();
		mockContract.ownerTokens = new Map();
	});

	it("should mint a new NFT when called by admin", () => {
		const result = mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5V39NHDPWSXMW9QDT3PX3B6N6F6ZG2E4TOVAS",
			500n
		);
		expect(result).toEqual({ value: 1n });
		expect(mockContract.tokenOwners.get(1n)).toBe(mockContract.admin);
		expect(mockContract.tokenMetadata.get(1n)?.uri).toBe("ipfs://design12345");
		expect(mockContract.ownerTokenCount.get(mockContract.admin)).toBe(1n);
		expect(mockContract.ownerTokens.get(mockContract.admin)?.tokens).toEqual([
			1n,
		]);
	});

	it("should fail to mint with short URI or license", () => {
		const shortUriResult = mockContract.mint(
			mockContract.admin,
			"ipfs://x",
			"Bio design description",
			"MIT License 123",
			"ST2CY5...",
			500n
		);
		expect(shortUriResult).toEqual({ error: 110 });

		const shortLicenseResult = mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT",
			"ST2CY5...",
			500n
		);
		expect(shortLicenseResult).toEqual({ error: 110 });
	});

	it("should prevent minting over max supply", () => {
		mockContract.tokenCounter = mockContract.MAX_SUPPLY;
		const result = mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"desc",
			"MIT License 123",
			"ST2CY5...",
			500n
		);
		expect(result).toEqual({ error: 107 });
	});

	it("should transfer NFT to new recipient", () => {
		mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5V39NHDPWSXMW9QDT3PX3B6N6F6ZG2E4TOVAS",
			500n
		);
		const result = mockContract.transfer(
			mockContract.admin,
			1n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(result).toEqual({ value: true });
		expect(mockContract.tokenOwners.get(1n)).toBe(
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(mockContract.ownerTokenCount.get(mockContract.admin)).toBe(0n);
		expect(
			mockContract.ownerTokenCount.get(
				"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
			)
		).toBe(1n);
	});

	it("should fail to transfer non-existent token", () => {
		const result = mockContract.transfer(
			mockContract.admin,
			999n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(result).toEqual({ error: 102 });
	});

	it("should approve and transfer via operator", () => {
		mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5V39NHDPWSXMW9QDT3PX3B6N6F6ZG2E4TOVAS",
			500n
		);
		mockContract.approve(mockContract.admin, 1n, "STOPERATOR");
		const transferResult = mockContract.transfer(
			"STOPERATOR",
			1n,
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
		expect(transferResult).toEqual({ value: true });
		expect(mockContract.tokenOwners.get(1n)).toBe(
			"ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
		);
	});

	it("should burn NFT", () => {
		mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5V39NHDPWSXMW9QDT3PX3B6N6F6ZG2E4TOVAS",
			500n
		);
		const result = mockContract.burn(mockContract.admin, 1n);
		expect(result).toEqual({ value: true });
		expect(mockContract.tokenOwners.has(1n)).toBe(false);
		expect(mockContract.ownerTokenCount.get(mockContract.admin)).toBe(0n);
	});

	it("should fail to burn non-existent token", () => {
		const result = mockContract.burn(mockContract.admin, 999n);
		expect(result).toEqual({ error: 102 });
	});

	it("should update metadata if not frozen", () => {
		mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5V39NHDPWSXMW9QDT3PX3B6N6F6ZG2E4TOVAS",
			500n
		);
		const result = mockContract.updateMetadata(
			mockContract.admin,
			1n,
			"ipfs://newdesign123",
			"Updated desc",
			"New License 123"
		);
		expect(result).toEqual({ value: true });
		const metadata = mockContract.tokenMetadata.get(1n);
		expect(metadata?.uri).toBe("ipfs://newdesign123");
		expect(metadata?.version).toBe(2n);
	});

	it("should fail to update metadata with short URI or license", () => {
		mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5...",
			500n
		);
		const shortUriResult = mockContract.updateMetadata(
			mockContract.admin,
			1n,
			"ipfs://x",
			"Updated desc",
			"New License 123"
		);
		expect(shortUriResult).toEqual({ error: 110 });

		const shortLicenseResult = mockContract.updateMetadata(
			mockContract.admin,
			1n,
			"ipfs://newdesign123",
			"Updated desc",
			"MIT"
		);
		expect(shortLicenseResult).toEqual({ error: 110 });
	});

	it("should freeze metadata and prevent further updates", () => {
		mockContract.mint(
			mockContract.admin,
			"ipfs://design12345",
			"Bio design description",
			"MIT License 123",
			"ST2CY5V39NHDPWSXMW9QDT3PX3B6N6F6ZG2E4TOVAS",
			500n
		);
		const freezeResult = mockContract.freezeMetadata(mockContract.admin, 1n);
		expect(freezeResult).toEqual({ value: true });
		const updateResult = mockContract.updateMetadata(
			mockContract.admin,
			1n,
			"ipfs://newdesign123",
			"new desc",
			"New License 123"
		);
		expect(updateResult).toEqual({ error: 108 });
	});
});
