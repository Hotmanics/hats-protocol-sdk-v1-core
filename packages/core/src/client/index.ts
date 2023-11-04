import { decodeEventLog, encodeEventTopics, encodeFunctionData } from "viem";
import { HatsSubgraphClient } from "@hatsprotocol/sdk-v1-subgraph";

import { HATS_ABI } from "../abi/Hats";
import {
  ChainIdMismatchError,
  MissingPublicClientError,
  MissingWalletClientError,
  TransactionRevertedError,
  ZeroToggleError,
  ZeroEligibilityError,
  NotAdminError,
  InvalidAdminError,
  AlreadyWearingError,
  NotActiveError,
  NotEligibleError,
  AllHatsWornError,
  HatNotExistError,
  NotToggleError,
  NotEligibilityError,
  NotWearerError,
  ImmutableHatError,
  StringTooLongError,
  InvalidMaxSupplyError,
  CrossLinkageError,
  CircularLinkageError,
  NotAdminOrWearerError,
  NoLinkageRequestError,
  BatchParamsError,
  MultiCallError,
  MaxLevelReachedError,
  MaxHatsInLevelReached,
} from "../errors";
import {
  HATS_V1,
  MAX_LEVEL_HATS,
  MAX_LEVELS,
  ZERO_ADDRESS,
} from "../constants";
import { treeIdDecimalToHex, hatIdHexToDecimal } from "./utils";
import type {
  PublicClient,
  WalletClient,
  Account,
  Address,
  Hex,
  TransactionReceipt,
} from "viem";
import type {
  CreateHatResult,
  MintTopHatResult,
  BatchCreateHatsResult,
  MintHatResult,
  RenounceHatResult,
  ChangeHatDetailsResult,
  ChangeHatEligibilityResult,
  ChangeHatToggleResult,
  ChangeHatImageURIResult,
  ChangeHatMaxSupplyResult,
  MakeHatImmutableResult,
  BatchMintHatsResult,
  SetHatStatusResult,
  TransferHatResult,
  SetHatWearerStatusResult,
  CheckHatStatusResult,
  CheckHatWearerStatusResult,
  RequestLinkTopHatToTreeResult,
  ApproveLinkTopHatToTreeResult,
  UnlinkTopHatFromTreeResult,
  RelinkTopHatWithinTreeResult,
  MultiCallResult,
} from "../types";

export class HatsClient {
  readonly chainId: number;
  private readonly _publicClient: PublicClient;
  private readonly _walletClient: WalletClient | undefined;
  private readonly _graphqlClient: HatsSubgraphClient | undefined;

  /**
   * Initialize a HatsClient.
   *
   * @param chainId - Client chain ID. The client is initialized to work with one specific chain.
   * @param publicClient - Viem Public Client
   * @param walletClient - Optional Viem Wallet Client. If not provided, then only read operations will be possible.
   * @returns A HatsClient instance.
   *
   * @throws MissingPublicClientError
   * Thrown when a public client is not provided.
   *
   * @throws ChainIdMismatchError
   * Thrown when there is a chain ID mismatch between one of the Viem clients and/or the provided chain ID.
   */
  constructor({
    chainId,
    publicClient,
    walletClient,
  }: {
    chainId: number;
    publicClient: PublicClient;
    walletClient?: WalletClient;
  }) {
    if (publicClient === undefined) {
      throw new MissingPublicClientError("Public client is required");
    }

    if (publicClient.chain?.id !== chainId) {
      throw new ChainIdMismatchError(
        "Provided chain id should match the public client chain id"
      );
    }

    if (walletClient !== undefined && walletClient.chain?.id !== chainId) {
      throw new ChainIdMismatchError(
        "Provided chain id should match the wallet client chain id"
      );
    }

    this.chainId = chainId;
    this._graphqlClient = new HatsSubgraphClient();
    this._publicClient = publicClient;
    this._walletClient = walletClient;
  }

  /*//////////////////////////////////////////////////////////////
                      Onchain Read Functions
    //////////////////////////////////////////////////////////////*/

  /**
   * Get a hat's properties.
   *
   * @param hatId - The hat ID.
   * @returns An object containing the hat's properties.
   */
  async viewHat(hatId: bigint): Promise<{
    details: string;
    maxSupply: number;
    supply: number;
    eligibility: Address;
    toggle: Address;
    imageUri: string;
    numChildren: number;
    mutable: boolean;
    active: boolean;
  }> {
    const result = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "viewHat",
      args: [BigInt(hatId)],
    });

    return {
      details: result[0],
      maxSupply: result[1],
      supply: result[2],
      eligibility: result[3],
      toggle: result[4],
      imageUri: result[5],
      numChildren: result[6],
      mutable: result[7],
      active: result[8],
    };
  }

  /**
   * Check if an address is a wearer of a specific hat.
   *
   * @param wearer - Address to check.
   * @param hatId - The hat ID.
   * @returns True if the address weares the hat, false otherwise.
   */
  async isWearerOfHat({
    wearer,
    hatId,
  }: {
    wearer: Address;
    hatId: bigint;
  }): Promise<boolean> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isWearerOfHat",
      args: [wearer, hatId],
    });

    return res;
  }

  /**
   * Check if an address is an admin of a specific hat.
   *
   * @param user - The address to check.
   * @param hatId - The hat ID.
   * @returns True is the address is an admin of the hat, false otherwise.
   */
  async isAdminOfHat({
    user,
    hatId,
  }: {
    user: Address;
    hatId: bigint;
  }): Promise<boolean> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isAdminOfHat",
      args: [user, hatId],
    });

    return res;
  }

  /**
   * Check if a hat is active.
   *
   * @param hatId - The hat ID.
   * @returns True if active, false otherwise.
   */
  async isActive(hatId: bigint): Promise<boolean> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isActive",
      args: [hatId],
    });

    return res;
  }

  /**
   * Check if a wearer is in good standing.
   *
   * @param wearer - The address of the wearer.
   * @param hatID - The hat ID.
   * @returns True if the wearer is in good standing, false otherwise.
   */
  async isInGoodStanding({
    wearer,
    hatId,
  }: {
    wearer: Address;
    hatId: bigint;
  }): Promise<boolean> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isInGoodStanding",
      args: [wearer, hatId],
    });

    return res;
  }

  /**
   * Check if an address is eligible for a specific hat.
   *
   * @param wearer - The Address to check.
   * @param hatId - THe hat ID.
   * @returns True if eligible, false otherwise.
   */
  async isEligible({
    wearer,
    hatId,
  }: {
    wearer: Address;
    hatId: bigint;
  }): Promise<boolean> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isEligible",
      args: [wearer, hatId],
    });

    return res;
  }

  async predictNextChildrenHatIDs({
    admin,
    numChildren,
  }: {
    admin: bigint;
    numChildren: number;
  }): Promise<bigint[]> {
    const res: bigint[] = [];
    if (numChildren < 1) {
      return res;
    }

    const adminHat = await this.viewHat(admin);
    if (adminHat.numChildren + numChildren > MAX_LEVEL_HATS) {
      throw new MaxHatsInLevelReached(
        "Maximum amount of hats per level is 65535"
      );
    }

    const level = await this.getLocalHatLevel(admin);
    if (level === MAX_LEVELS) {
      throw new MaxLevelReachedError(
        "The provided admin's hat level is on the maximul level"
      );
    }

    const contractDetails = {
      address: HATS_V1 as Address,
      abi: HATS_ABI,
    };

    const calls = [];
    for (let i = 0; i < numChildren; i++) {
      calls.push({
        ...contractDetails,
        functionName: "buildHatId",
        args: [admin, adminHat.numChildren + i + 1],
      });
    }
    const childHats = await this._publicClient.multicall({
      contracts: calls,
    });
    childHats.forEach((hat) => {
      if (hat.result !== undefined) {
        res.push(hat.result as bigint);
      }
    });

    return res;
  }

  /**
   * Get the number of trees.
   *
   * @returns The number of already created trees.
   */
  async getTreesCount(): Promise<number> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "lastTopHatId",
    });

    return res;
  }

  /**
   * Get the linkage request of a tree.
   *
   * @param topHatDomain - The tree domain. The tree domain is the first four bytes of the tophat ID.
   * @returns If request exists, returns the requested new admin hat ID. If not, returns zero.
   */
  async getLinkageRequest(topHatDomain: number): Promise<bigint> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "linkedTreeRequests",
      args: [topHatDomain],
    });

    return res;
  }

  /**
   * Get the admin of a linked tree.
   *
   * @param topHatDomain - The tree domain. The tree domain is the first four bytes of the tophat ID.
   * @returns If tree is linked, returns the admin hat ID of the linked tree. If not, returns zero.
   */
  async getLinkedTreeAdmin(topHatDomain: number): Promise<bigint> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "linkedTreeAdmins",
      args: [topHatDomain],
    });

    return res;
  }

  /**
   * Get a hat's level. If the tree is linked, level is calulated in the global tree (formed of all linked trees).
   * @param hatId - The hat ID.
   * @returns The hat's level in the global tree.
   */
  async getHatLevel(hatId: bigint): Promise<number> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "getHatLevel",
      args: [hatId],
    });

    return res;
  }

  /**
   * Get a hat's level in its local tree (without considering linked trees).
   * @param hatId - The hat ID.
   * @returns The hat's local level.
   */
  async getLocalHatLevel(hatId: bigint): Promise<number> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "getLocalHatLevel",
      args: [hatId],
    });

    return res;
  }

  /**
   * Get a hat's tree domain.
   *
   * @param hatId - The hat ID.
   * @returns The tree domain of the hat. The tree domain is the first four bytes of the tophat ID.
   */
  async getTopHatDomain(hatId: bigint): Promise<number> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "getTopHatDomain",
      args: [hatId],
    });

    return res;
  }

  /**
   * Get the tree domain of the global's tree tophat (tippy top hat), which the provided tree is included in.
   *
   * @param topHatDomain The tree domain. The tree domain is the first four bytes of the tophat ID.
   * @returns The tree domain of the tippy top hat.
   */
  async getTippyTopHatDomain(topHatDomain: number): Promise<number> {
    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "getTippyTopHatDomain",
      args: [topHatDomain],
    });

    return res;
  }

  /**
   * Get the direct admin of a hat (its parent).
   * @param hatId- The hat ID.
   * @returns The admin's hat ID. If the provided hat is an unlinked tophat, then this top hat is returned, as it is
   * the admin of itself.
   */
  async getAdmin(hatId: bigint): Promise<bigint> {
    const hatLevel = await this.getHatLevel(hatId);
    if (hatLevel === 0) {
      return hatId;
    }

    const res = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "getAdminAtLevel",
      args: [hatId, hatLevel - 1],
    });

    return res;
  }

  /**
   * Get the children hats of a hat.
   *
   * @param hatId - The hat ID.
   * @returns An array of all children hats IDs.
   */
  async getChildrenHats(hatId: bigint): Promise<bigint[]> {
    const res: bigint[] = [];
    const hat = await this.viewHat(hatId);

    if (hat.numChildren === 0) {
      return res;
    }

    for (let i = 0; i < hat.numChildren; i++) {
      const childHatId = await this._publicClient.readContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "buildHatId",
        args: [hatId, i + 1],
      });
      res.push(childHatId);
    }

    return res;
  }

  /*//////////////////////////////////////////////////////////////
                      Write Functions
    //////////////////////////////////////////////////////////////*/

  /**
   * Create a new tophat (new tree).
   *
   * @param account - A Viem account.
   * @param target - Tophat's wearer address.
   * @param details - Tophat's details field.
   * @param imageURIi - Optional tophat's image URI.
   * @returns An object containing the status of the call, the transactions hash and the created tophat ID.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpeced reason.
   */
  async mintTopHat({
    account,
    target,
    details,
    imageURI,
  }: {
    account: Account | Address;
    target: Address;
    details: string;
    imageURI?: string;
  }): Promise<MintTopHatResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "mintTopHat",
        args: [target, details, imageURI === undefined ? "" : imageURI],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      const event = decodeEventLog({
        abi: HATS_ABI,
        eventName: "HatCreated",
        data: receipt.logs[0].data,
        topics: receipt.logs[0].topics,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
        hatId: event.args.id,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Create a hat.
   *
   * @param account - A Viem account.
   * @param admin - Hat's admin ID.
   * @param details - Hat's details field.
   * @param maxSupply - Hat's maximum amount of possible wearers.
   * @param eligibility - Hat's eligibility address (zero address is not valid).
   * @param toggle - Hat's toggle address (zero address is not valid).
   * @param mutable - True if the hat should be mutable, false otherwise.
   * @param imageURI - Optional hat's image URI.
   * @returns An object containing the status of the call, the transaction hash and the created hat ID.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws ZeroEligibilityError
   * Throws if provided the zero address as an eligibility.
   *
   * @throws ZeroToggleError
   * Throws if provided the zero address as a toggle.
   *
   * @throws InvalidAdminError
   * Throws if the provided admin ID is not valid.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat that will be created.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   *
   */
  async createHat({
    account,
    admin,
    details,
    maxSupply,
    eligibility,
    toggle,
    mutable,
    imageURI,
  }: {
    account: Account | Address;
    admin: bigint;
    details: string;
    maxSupply: number;
    eligibility: Address;
    toggle: Address;
    mutable: boolean;
    imageURI?: string;
  }): Promise<CreateHatResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }
    await this._validateHatCreation({ account, admin, eligibility, toggle });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "createHat",
        args: [
          BigInt(admin),
          details,
          maxSupply,
          eligibility,
          toggle,
          mutable,
          imageURI === undefined ? "" : imageURI,
        ],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      const event = decodeEventLog({
        abi: HATS_ABI,
        eventName: "HatCreated",
        data: receipt.logs[0].data,
        topics: receipt.logs[0].topics,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
        hatId: event.args.id,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Create multiple hats.
   *
   * @param account - A Viem account.
   * @param admins - The hats admin IDs.
   * @param details - The hats details fields.
   * @param maxSupplies - The hats maximum amounts of possible wearers.
   * @param eligibilityModules - The hats eligibility addresses (zero address is not valid).
   * @param toggleModules - The hats toggle addresses (zero address is not valid).
   * @param mutables - True if the hat should be mutable, false otherwise.
   * @param imageURIs - Optional hats image URIs.
   * @returns An object containing the status of the call, the transaction hash and the created hat IDs.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws ZeroEligibilityError
   * Throws if provided the zero address as an eligibility.
   *
   * @throws ZeroToggleError
   * Throws if provided the zero address as a toggle.
   *
   * @throws InvalidAdminError
   * Throws if the provided admin ID is not valid.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat that will be created.
   *
   * @throws BatchParamsError
   * Throws if there is a length mismatch between the provided hats properties.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   *
   */
  async batchCreateHats({
    account,
    admins,
    details,
    maxSupplies,
    eligibilityModules,
    toggleModules,
    mutables,
    imageURIs,
  }: {
    account: Account | Address;
    admins: bigint[];
    details: string[];
    maxSupplies: number[];
    eligibilityModules: Address[];
    toggleModules: Address[];
    mutables: boolean[];
    imageURIs?: string[];
  }): Promise<BatchCreateHatsResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    const length = admins.length;

    if (
      length !== details.length ||
      length !== maxSupplies.length ||
      length !== eligibilityModules.length ||
      length !== toggleModules.length ||
      length !== mutables.length ||
      (imageURIs !== undefined && length !== imageURIs.length)
    ) {
      throw new BatchParamsError("Length mismatch");
    }

    for (let i = 0; i < admins.length; i++) {
      await this._validateHatCreation({
        account,
        admin: admins[i],
        eligibility: eligibilityModules[i],
        toggle: toggleModules[i],
      });
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "batchCreateHats",
        args: [
          admins,
          details,
          maxSupplies,
          eligibilityModules,
          toggleModules,
          mutables,
          imageURIs === undefined ? Array(admins.length).fill("") : imageURIs,
        ],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      const newHatIds: bigint[] = [];

      for (let i = 0; i < admins.length; i++) {
        const event = decodeEventLog({
          abi: HATS_ABI,
          eventName: "HatCreated",
          data: receipt.logs[i].data,
          topics: receipt.logs[i].topics,
        });

        newHatIds.push(event.args.id);
      }

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
        hatIds: newHatIds,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Mint a hat.
   *
   * @param account - A Viem account.
   * @param hatId - ID of the minted hat.
   * @param wearer - Address of the new wearer.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of hat.
   *
   * @throws HatNotExistError
   * Throws if the hat does not exist.
   *
   * @throws AllHatsWornError
   * Throws if all the hats of the provided hat ID are currently worn.
   *
   * @throws NotEligibleError
   * Throws if the new wearer is not eligible for the hat.
   *
   * @throws NotActiveError
   * Throws if the hat is not active.
   *
   * @throws AlreadyWearingError
   * Throws if the new wearer is already wearing the hat.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   *
   */
  async mintHat({
    account,
    hatId,
    wearer,
  }: {
    account: Account | Address;
    hatId: bigint;
    wearer: Address;
  }): Promise<MintHatResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }
    await this._validateHatMinting({ account, hatId, wearer });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "mintHat",
        args: [hatId, wearer],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Mint multiple hats.
   *
   * @param account - A Viem account.
   * @param hatIds - IDs of the minted hats.
   * @param wearers - Addresses of the new wearers.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of hat.
   *
   * @throws HatNotExistError
   * Throws if the hat does not exist.
   *
   * @throws AllHatsWornError
   * Throws if all the hats of the provided hat ID are currently worn.
   *
   * @throws NotEligibleError
   * Throws if the new wearer is not eligible for the hat.
   *
   * @throws NotActiveError
   * Throws if the hat is not active.
   *
   * @throws AlreadyWearingError
   * Throws if the new wearer is already wearing the hat.
   *
   * * @throws BatchParamsError
   * Throws if there is a length mismatch between the provided properties.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   *
   */
  async batchMintHats({
    account,
    hatIds,
    wearers,
  }: {
    account: Account | Address;
    hatIds: bigint[];
    wearers: Address[];
  }): Promise<BatchMintHatsResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    if (hatIds.length !== wearers.length) {
      throw new BatchParamsError("Length mismatch");
    }

    for (let i = 0; i < hatIds.length; i++) {
      await this._validateHatMinting({
        account,
        hatId: hatIds[i],
        wearer: wearers[i],
      });
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "batchMintHats",
        args: [hatIds, wearers],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Set a hat's status to active/inactive.
   *
   * @param account - A Viem account.
   * @param hatId - hat ID.
   * @param newStatus - Hat's new status: true for active, false for inactive.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotToggleError
   * Throws if the calling account is not the toggle of the hat.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async setHatStatus({
    account,
    hatId,
    newStatus,
  }: {
    account: Account | Address;
    hatId: bigint;
    newStatus: boolean;
  }): Promise<SetHatStatusResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    const hat = await this.viewHat(hatId);
    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }
    if (hat.toggle !== accountAddress) {
      throw new NotToggleError("The calling account is not the hat toggle");
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "setHatStatus",
        args: [hatId, newStatus],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Check a hat's status by calling its toggle module, and updating the status as needed.
   *
   * @param account - A Viem account.
   * @param hatId - Hat Id.
   * @returns An object containing the status of the call, the transaction hash, an indicator whether the status was
   * toggled and the new status in case the status was toggled.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async checkHatStatus({
    account,
    hatId,
  }: {
    account: Account | Address;
    hatId: bigint;
  }): Promise<CheckHatStatusResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "checkHatStatus",
        args: [hatId],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt.logs.length === 0) {
        return {
          status: receipt.status,
          transactionHash: receipt.transactionHash,
          toggled: false,
        };
      } else {
        const event = decodeEventLog({
          abi: HATS_ABI,
          eventName: "HatStatusChanged",
          data: receipt.logs[0].data,
          topics: receipt.logs[0].topics,
        });
        return {
          status: receipt.status,
          transactionHash: receipt.transactionHash,
          toggled: true,
          newStatus: event.args.newStatus ? "active" : "inactive",
        };
      }
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Set a hat's wearer status.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param wearer - Wearer address.
   * @param eligible - Wearer's eligibility. True for eligible, false otherwise.
   * @param standing - Wearer's standing. True for good, false for bad.
   * @returns An object containing the status of the call and the transaction hash
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotEligibilityError
   * Throws if the calling account is not the eligibility of the hat.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async setHatWearerStatus({
    account,
    hatId,
    wearer,
    eligible,
    standing,
  }: {
    account: Account | Address;
    hatId: bigint;
    wearer: Address;
    eligible: boolean;
    standing: boolean;
  }): Promise<SetHatWearerStatusResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    const hat = await this.viewHat(hatId);
    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }
    if (hat.eligibility !== accountAddress) {
      throw new NotEligibilityError(
        "The calling account is not the hat eligibility"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "setHatWearerStatus",
        args: [hatId, wearer, eligible, standing],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Check a hat's wearer status by calling the hat's eligibilty module.
   * If the wearer is in non eligible and/or in bad standing, then its hat is burned.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param wearer - Wearer address.
   * @returns An object containing the status of the call, the transaction hash, indicator whether the wearer's standing
   * was updated, indicator whether the wearer's hat was burned and if standing has changed then the new standing.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async checkHatWearerStatus({
    account,
    hatId,
    wearer,
  }: {
    account: Account | Address;
    hatId: bigint;
    wearer: Address;
  }): Promise<CheckHatWearerStatusResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "checkHatWearerStatus",
        args: [hatId, wearer],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt.logs.length === 0) {
        return {
          status: receipt.status,
          transactionHash: receipt.transactionHash,
          wearerStandingUpdated: false,
          hatBurned: false,
        };
      } else if (receipt.logs.length === 1) {
        const burnEventTopic = encodeEventTopics({
          abi: HATS_ABI,
          eventName: "TransferSingle",
        });
        const wearerStandingChangedTopic = encodeEventTopics({
          abi: HATS_ABI,
          eventName: "WearerStandingChanged",
        });

        if (receipt.logs[0].topics[0] === burnEventTopic[0]) {
          return {
            status: receipt.status,
            transactionHash: receipt.transactionHash,
            wearerStandingUpdated: false,
            hatBurned: true,
          };
        } else if (
          receipt.logs[0].topics[0] === wearerStandingChangedTopic[0]
        ) {
          const event = decodeEventLog({
            abi: HATS_ABI,
            eventName: "WearerStandingChanged",
            data: receipt.logs[0].data,
            topics: receipt.logs[0].topics,
          });
          return {
            status: receipt.status,
            transactionHash: receipt.transactionHash,
            wearerStandingUpdated: true,
            hatBurned: false,
            newWearerStanding: event.args.wearerStanding ? "good" : "bad",
          };
        } else {
          throw new Error("Unexpected error");
        }
      } else {
        const wearerStandingChangedEvent = decodeEventLog({
          abi: HATS_ABI,
          eventName: "WearerStandingChanged",
          data: receipt.logs[1].data,
          topics: receipt.logs[1].topics,
        });

        return {
          status: receipt.status,
          transactionHash: receipt.transactionHash,
          wearerStandingUpdated: true,
          hatBurned: true,
          newWearerStanding: wearerStandingChangedEvent.args.wearerStanding
            ? "good"
            : "bad",
        };
      }
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Renounce a hat. This action burns the hat for the renouncing wearer.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID of the hat the caller wishes to renounce.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async renounceHat({
    account,
    hatId,
  }: {
    account: Account | Address;
    hatId: bigint;
  }): Promise<RenounceHatResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "renounceHat",
        args: [hatId],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Transfer a hat from one wearer to another.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID to be transfered.
   * @param from - Current wearer address.
   * @param to - New wearer address.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable. Immutable hats cannot be transfered.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws NotEligibleError
   * Throws if the new wearer is not eligible for the hat.
   *
   * @throws NotActiveError
   * THrows if the hat is not active.
   *
   * @throws NotWearerError
   * Throws if the provided current wearer is not wearing the hat.
   *
   * @throws AlreadyWearingError
   * Throws if the new wearer is already wearing the hat.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async transferHat({
    account,
    hatId,
    from,
    to,
  }: {
    account: Account | Address;
    hatId: bigint;
    from: Address;
    to: Address;
  }): Promise<TransferHatResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateHatTransfer({ account, hatId, from, to });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "transferHat",
        args: [hatId, from, to],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Make a hat immutable.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable. Immutable hats cannot be edited.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async makeHatImmutable({
    account,
    hatId,
  }: {
    account: Account | Address;
    hatId: bigint;
  }): Promise<MakeHatImmutableResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateHatEdit({ account, hatId });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "makeHatImmutable",
        args: [hatId],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Change a hat's details.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param newDetails - The new details.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable.
   *
   * @throws StringTooLongError
   * Throws if the new details length is larger than 7000.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async changeHatDetails({
    account,
    hatId,
    newDetails,
  }: {
    account: Account | Address;
    hatId: bigint;
    newDetails: string;
  }): Promise<ChangeHatDetailsResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateHatEditOrTophat({ account, hatId });

    if (newDetails.length > 7000) {
      throw new StringTooLongError("Details field max length is 7000");
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "changeHatDetails",
        args: [hatId, newDetails],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Change a hat's eligibility.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param newEligibility - The new eligibility address. Zero address is not valid.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable.
   *
   * @throws ZeroEligibilityError
   * Throws if the new eligibilty is the zero address.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async changeHatEligibility({
    account,
    hatId,
    newEligibility,
  }: {
    account: Account | Address;
    hatId: bigint;
    newEligibility: Address;
  }): Promise<ChangeHatEligibilityResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateHatEdit({ account, hatId });

    if (newEligibility == ZERO_ADDRESS) {
      throw new ZeroEligibilityError("Zero eligibility address not valid");
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "changeHatEligibility",
        args: [hatId, newEligibility],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Change a hat's toggle.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param newToggle - The new toggle address. Zero address is not valid.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable.
   *
   * @throws ZeroToggleError
   * Throws if the new toggle is the zero address.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async changeHatToggle({
    account,
    hatId,
    newToggle,
  }: {
    account: Account | Address;
    hatId: bigint;
    newToggle: Address;
  }): Promise<ChangeHatToggleResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateHatEdit({ account, hatId });

    if (newToggle == ZERO_ADDRESS) {
      throw new ZeroToggleError("Zero toggle address not valid");
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "changeHatToggle",
        args: [hatId, newToggle],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Change a hat's image URI.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param newImageURI - The new image URI.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable.
   *
   * @throws StringTooLongError
   * Throws if the new image URI length is larger than 7000.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async changeHatImageURI({
    account,
    hatId,
    newImageURI,
  }: {
    account: Account | Address;
    hatId: bigint;
    newImageURI: string;
  }): Promise<ChangeHatImageURIResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateHatEditOrTophat({ account, hatId });

    if (newImageURI.length > 7000) {
      throw new StringTooLongError("Image URI field max length is 7000");
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "changeHatImageURI",
        args: [hatId, newImageURI],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Change a hat's max supply.
   *
   * @param account - A Viem account.
   * @param hatId - Hat ID.
   * @param newMaxSupply -New maximum supply for the hat.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the hat.
   *
   * @throws ImmutableHatError
   * Throws if the hat is immutable.
   *
   * @throws InvalidMaxSupplyError
   * Throws if the new maximum supply is smaller the current amount of wearers.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async changeHatMaxSupply({
    account,
    hatId,
    newMaxSupply,
  }: {
    account: Account | Address;
    hatId: bigint;
    newMaxSupply: number;
  }): Promise<ChangeHatMaxSupplyResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateMaxSupplyEdit({ account, hatId, newMaxSupply });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "changeHatMaxSupply",
        args: [hatId, newMaxSupply],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Request a link from a tophat to a new admin hat.
   *
   * @param account - A Viem account.
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param requestedAdminHat - ID of the requested new admin hat.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the tophat.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async requestLinkTopHatToTree({
    account,
    topHatDomain,
    requestedAdminHat,
  }: {
    account: Account | Address;
    topHatDomain: number;
    requestedAdminHat: bigint;
  }): Promise<RequestLinkTopHatToTreeResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateTopHatDomainAdmin({ account, topHatDomain });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "requestLinkTopHatToTree",
        args: [topHatDomain, requestedAdminHat],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Approve a tophat's linkage request.
   *
   * @param account - A Viem account.
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param newAdminHat - ID of the new admin hat.
   * @param newEligibility - Optional new eligibility for the linked tophat.
   * @param newToggle - Optional new toggle for the linked tophat.
   * @param newDetails - Optional new details for the linked tophat.
   * @param newImageURI - Optional new image URI for the linked tophat.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NoLinkageRequestError
   * Throws if the tophat has not requested the link.
   *
   * @throws NotAdminOrWearerError
   * Throws if the calling account is not an admin or a wearer of the new admin hat.
   *
   * @throws CircularLinkageError
   * Throws if linking the trees creates a circular linkage.
   *
   * @throws CrossLinkageError
   * Throws if the new admin hat is in a different global tree than the current global
   * tree of the tophat that is being linked or if the calling account has no permission
   * to relink to the new destination within the same global tree.
   *
   * * @throws StringTooLongErrorError
   * Throws if a new details or new image URI were provided and either length is greater
   * than 7000.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async approveLinkTopHatToTree({
    account,
    topHatDomain,
    newAdminHat,
    newEligibility,
    newToggle,
    newDetails,
    newImageURI,
  }: {
    account: Account | Address;
    topHatDomain: number;
    newAdminHat: bigint;
    newEligibility?: Address;
    newToggle?: Address;
    newDetails?: string;
    newImageURI?: string;
  }): Promise<ApproveLinkTopHatToTreeResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    const linkageRequestToHat = await this.getLinkageRequest(topHatDomain);
    if (linkageRequestToHat !== newAdminHat) {
      throw new NoLinkageRequestError(
        "Linkage has not been requested to the admin hat"
      );
    }

    await this._validateLinkage({
      account,
      topHatDomain,
      newAdminHat,
      newDetails,
      newImageURI,
    });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "approveLinkTopHatToTree",
        args: [
          topHatDomain,
          newAdminHat,
          newEligibility === undefined ? ZERO_ADDRESS : newEligibility,
          newToggle === undefined ? ZERO_ADDRESS : newToggle,
          newDetails === undefined ? "" : newDetails,
          newImageURI === undefined ? "" : newImageURI,
        ],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Unlink a tree.
   *
   * @param account - A Viem account.
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param wearer - The current wearer of the tophat that is about to be unlinked.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * @throws NotWearerError
   * Throws if provided wearer is not the wearer of the tophat.
   *
   * @throws NotAdminError
   * Throws if the calling account is not an admin of the tophat.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async unlinkTopHatFromTree({
    account,
    topHatDomain,
    wearer,
  }: {
    account: Account | Address;
    topHatDomain: number;
    wearer: Address;
  }): Promise<UnlinkTopHatFromTreeResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    await this._validateTopHatDomainAdmin({ account, topHatDomain });

    const topHatId = BigInt(treeIdDecimalToHex(topHatDomain).padEnd(66, "0"));
    const isWearer = await this.isWearerOfHat({ wearer, hatId: topHatId });
    if (wearer === ZERO_ADDRESS || !isWearer) {
      throw new NotWearerError("Wearer is not wearing the tophat");
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "unlinkTopHatFromTree",
        args: [topHatDomain, wearer],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /**
   * Relink a tree within the same global tree that it is already part of.
   *
   * @param account - A Viem account.
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param newAdminHat - ID of the new admin hat.
   * @param newEligibility - Optional new eligibility for the linked tophat.
   * @param newToggle - Optional new toggle for the linked tophat.
   * @param newDetails - Optional new details for the linked tophat.
   * @param newImageURI - Optional new image URI for the linked tophat.
   * @returns An object containing the status of the call and the transaction hash.
   *
   * @throws MissingWalletClientError
   * Throws if no wallet client was provided in the hats client initialization.
   *
   * * @throws NotAdminError
   * Throws if the calling account is not an admin of the tophat that is about to be relinked.
   *
   * @throws NotAdminOrWearerError
   * Throws if the calling account is not an admin or a wearer of the new admin hat.
   *
   * @throws CircularLinkageError
   * Throws if linking the trees creates a circular linkage.
   *
   * @throws CrossLinkageError
   * Throws if the new admin hat is in a different global tree than the current global
   * tree of the tophat that is being linked or if the calling account has no permission
   * to relink to the new destination within the same global tree.
   *
   * * @throws StringTooLongErrorError
   * Throws if a new details or new image URI were provided and either length is greater
   * than 7000.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async relinkTopHatWithinTree({
    account,
    topHatDomain,
    newAdminHat,
    newEligibility,
    newToggle,
    newDetails,
    newImageURI,
  }: {
    account: Account | Address;
    topHatDomain: number;
    newAdminHat: bigint;
    newEligibility?: Address;
    newToggle?: Address;
    newDetails?: string;
    newImageURI?: string;
  }): Promise<RelinkTopHatWithinTreeResult> {
    if (this._walletClient === undefined) {
      throw new Error("Wallet client is required to perform this action");
    }

    await this._validateTopHatDomainAdmin({ account, topHatDomain });

    await this._validateLinkage({
      account,
      topHatDomain,
      newAdminHat,
      newDetails,
      newImageURI,
    });

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "relinkTopHatWithinTree",
        args: [
          topHatDomain,
          newAdminHat,
          newEligibility === undefined ? ZERO_ADDRESS : newEligibility,
          newToggle === undefined ? ZERO_ADDRESS : newToggle,
          newDetails === undefined ? "" : newDetails,
          newImageURI === undefined ? "" : newImageURI,
        ],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new Error("Transaction reverted");
    }
  }

  /**
   * Batch multiple operations
   *
   * @param account - A Viem account.
   * @param calls - Array of call objects, containing the call data and the function name
   * @returns An object containing newly created, minted or burned hats and hat/wearer status changes as a result of the multicall
   *
   * @throws MultiCallError
   * Throws if the multicall simulation reverted.
   *
   * @throws TransactionRevertedError
   * Throws if the transaction reverted for an unexpected reason.
   */
  async multicall({
    account,
    calls,
  }: {
    account: Account | Address;
    calls: {
      functionName: string;
      callData: Hex;
    }[];
  }): Promise<MultiCallResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        "Wallet client is required to perform this action"
      );
    }

    const callDatas = calls.map((call) => call.callData);

    try {
      await this._publicClient.estimateContractGas({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "multicall",
        args: [callDatas],
        account,
      });
    } catch (err) {
      throw new MultiCallError("One or more of the calls will revert");
    }

    let receipt: TransactionReceipt;

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_V1,
        abi: HATS_ABI,
        functionName: "multicall",
        args: [callDatas],
        account,
        chain: this._walletClient.chain,
      });

      receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }

    const hatsCreated: bigint[] = [];
    const hatsMinted: {
      hatId: bigint;
      wearer: `0x${string}`;
    }[] = [];
    const hatsBurned: {
      hatId: bigint;
      wearer: `0x${string}`;
    }[] = [];
    const hatStatusChanges: {
      hatId: bigint;
      newStatus: "active" | "inactive";
    }[] = [];
    const wearerStandingChanges: {
      hatId: bigint;
      wearer: `0x${string}`;
      newStanding: "good" | "bad";
    }[] = [];

    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      try {
        const event = decodeEventLog({
          abi: HATS_ABI,
          data: log.data,
          topics: log.topics,
        });

        switch (event.eventName) {
          case "HatCreated": {
            hatsCreated.push(event.args.id);
            break;
          }
          case "TransferSingle": {
            if (event.args.to !== ZERO_ADDRESS) {
              hatsMinted.push({ hatId: event.args.id, wearer: event.args.to });
            }
            if (event.args.from !== ZERO_ADDRESS) {
              hatsBurned.push({
                hatId: event.args.id,
                wearer: event.args.from,
              });
            }
            break;
          }
          case "HatStatusChanged": {
            hatStatusChanges.push({
              hatId: event.args.hatId,
              newStatus: event.args.newStatus ? "active" : "inactive",
            });
            break;
          }
          case "WearerStandingChanged": {
            wearerStandingChanges.push({
              hatId: event.args.hatId,
              wearer: event.args.wearer,
              newStanding: event.args.wearerStanding ? "good" : "bad",
            });
            break;
          }
        }
      } catch (err) {
        console.log("Non Hats event encountered");
        continue;
      }
    }

    return {
      status: receipt.status,
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed,
      hatsCreated,
      hatsMinted,
      hatsBurned,
      hatStatusChanges,
      wearerStandingChanges,
    };
  }

  /*//////////////////////////////////////////////////////////////
                      Call Data functions
    //////////////////////////////////////////////////////////////*/

  /**
   * Return the call data a multicall operation.
   *
   * @param calls - An array with the call data strings, for each function call.
   * @returns An object containing the call data and the function name.
   */
  multicallCallData(calls: Hex[]): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "multicall",
      args: [calls],
    });

    return { functionName: "multicall", callData };
  }

  /**
   * Return the call data for a mintTopHat operation.
   *
   * @param target - Tophat's wearer address.
   * @param details - Tophat's details field.
   * @param imageURIi - Optional tophat's image URI.
   * @returns An object containing the call data and the function name.
   */
  mintTopHatCallData({
    target,
    details,
    imageURI,
  }: {
    target: Address;
    details: string;
    imageURI?: string;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "mintTopHat",
      args: [target, details, imageURI === undefined ? "" : imageURI],
    });

    return { functionName: "mintTopHat", callData };
  }

  /**
   * Return the call data for a createHat operation.
   *
   * @param admin - Hat's admin ID.
   * @param details - Hat's details field.
   * @param maxSupply - Hat's maximum amount of possible wearers.
   * @param eligibility - Hat's eligibility address (zero address is not valid).
   * @param toggle - Hat's toggle address (zero address is not valid).
   * @param mutable - True if the hat should be mutable, false otherwise.
   * @param imageURI - Optional hat's image URI.
   * @returns An object containing the call data and the function name.
   */
  createHatCallData({
    admin,
    details,
    maxSupply,
    eligibility,
    toggle,
    mutable,
    imageURI,
  }: {
    admin: bigint;
    details: string;
    maxSupply: number;
    eligibility: Address;
    toggle: Address;
    mutable: boolean;
    imageURI?: string;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "createHat",
      args: [
        admin,
        details,
        maxSupply,
        eligibility,
        toggle,
        mutable,
        imageURI === undefined ? "" : imageURI,
      ],
    });

    return { functionName: "createHat", callData };
  }

  /**
   * Return the call data for a transferHat operation.
   *
   * @param hatId - Hat ID to be transfered.
   * @param from - Current wearer address.
   * @param to - New wearer address.
   * @returns An object containing the call data and the function name.
   */
  transferHatCallData({
    hatId,
    from,
    to,
  }: {
    hatId: bigint;
    from: Address;
    to: Address;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "transferHat",
      args: [hatId, from, to],
    });

    return { functionName: "transferHat", callData };
  }

  /**
   * Return the call data for a mintHat operation.
   *
   * @param hatId - ID of the minted hat.
   * @param wearer - Address of the new wearer.
   * @returns An object containing the call data and the function name.
   */
  mintHatCallData({ hatId, wearer }: { hatId: bigint; wearer: Address }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "mintHat",
      args: [hatId, wearer],
    });

    return { functionName: "mintHat", callData };
  }

  /**
   * Return the call data for a batchCreateHats operation.
   *
   * @param admins - The hats admin IDs.
   * @param details - The hats details fields.
   * @param maxSupplies - The hats maximum amounts of possible wearers.
   * @param eligibilityModules - The hats eligibility addresses (zero address is not valid).
   * @param toggleModules - The hats toggle addresses (zero address is not valid).
   * @param mutables - True if the hat should be mutable, false otherwise.
   * @param imageURIs - Optional hats image URIs.
   * @returns An object containing the call data and the function name.
   */
  batchCreateHatsCallData({
    admins,
    details,
    maxSupplies,
    eligibilityModules,
    toggleModules,
    mutables,
    imageURIs,
  }: {
    admins: bigint[];
    details: string[];
    maxSupplies: number[];
    eligibilityModules: Address[];
    toggleModules: Address[];
    mutables: boolean[];
    imageURIs?: string[];
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "batchCreateHats",
      args: [
        admins,
        details,
        maxSupplies,
        eligibilityModules,
        toggleModules,
        mutables,
        imageURIs === undefined ? Array(admins.length).fill("") : imageURIs,
      ],
    });

    return { functionName: "batchCreateHats", callData };
  }

  /**
   * Return the call data for a batchMintHats operation.
   *
   * @param hatIds - IDs of the minted hats.
   * @param wearers - Addresses of the new wearers.
   * @returns An object containing the call data and the function name.
   */
  batchMintHatsCallData({
    hatIds,
    wearers,
  }: {
    hatIds: bigint[];
    wearers: Address[];
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "batchMintHats",
      args: [hatIds, wearers],
    });

    return { functionName: "batchMintHats", callData };
  }

  /**
   * Return the call data for a setHatStatus operation.
   *
   * @param hatId - hat ID.
   * @param newStatus - Hat's new status: true for active, false for inactive.
   * @returns An object containing the call data and the function name.
   */
  setHatStatusCallData({
    hatId,
    newStatus,
  }: {
    hatId: bigint;
    newStatus: boolean;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "setHatStatus",
      args: [hatId, newStatus],
    });

    return { functionName: "setHatStatus", callData };
  }

  checkHatStatusCallData({ hatId }: { hatId: bigint }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "checkHatStatus",
      args: [hatId],
    });

    return { functionName: "checkHatStatus", callData };
  }

  /**
   * Return the call data for a setHatWearerStatus operation.
   *
   * @param hatId - Hat ID.
   * @param wearer - Wearer address.
   * @param eligible - Wearer's eligibility. True for eligible, false otherwise.
   * @param standing - Wearer's standing. True for good, false for bad.
   * @returns An object containing the call data and the function name.
   */
  setHatWearerStatusCallData({
    hatId,
    wearer,
    eligible,
    standing,
  }: {
    hatId: bigint;
    wearer: Address;
    eligible: boolean;
    standing: boolean;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "setHatWearerStatus",
      args: [hatId, wearer, eligible, standing],
    });

    return { functionName: "setHatWearerStatus", callData };
  }

  /**
   * Return the call data for a checkHatWearerStatus operation.
   *
   * @param hatId - Hat ID.
   * @param wearer - Wearer address.
   * @returns An object containing the call data and the function name.
   */
  checkHatWearerStatusCallData({
    hatId,
    wearer,
  }: {
    hatId: bigint;
    wearer: Address;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "checkHatWearerStatus",
      args: [hatId, wearer],
    });

    return { functionName: "checkHatWearerStatus", callData };
  }

  /**
   * Return the call data for a renounceHat operation.
   *
   * @param hatId - Hat ID of the hat the caller wishes to renounce.
   * @returns An object containing the call data and the function name.
   */
  renounceHatCallData({ hatId }: { hatId: bigint }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "renounceHat",
      args: [hatId],
    });

    return { functionName: "renounceHat", callData };
  }

  /**
   * Return the call data for a makeHatImmutable operation.
   *
   * @param hatId - Hat ID.
   * @returns An object containing the call data and the function name.
   */
  makeHatImmutableCallData({ hatId }: { hatId: bigint }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "makeHatImmutable",
      args: [hatId],
    });

    return { functionName: "makeHatImmutable", callData };
  }

  /**
   * Return the call data for a changeHatDetails operation.
   *
   * @param hatId - Hat ID.
   * @param newDetails - The new details.
   * @returns An object containing the call data and the function name.
   */
  changeHatDetailsCallData({
    hatId,
    newDetails,
  }: {
    hatId: bigint;
    newDetails: string;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "changeHatDetails",
      args: [hatId, newDetails],
    });

    return { functionName: "changeHatDetails", callData };
  }

  /**
   * Return the call data for a changeHatEligibility operation.
   *
   * @param hatId - Hat ID.
   * @param newEligibility - The new eligibility address. Zero address is not valid.
   * @returns An object containing the call data and the function name.
   */
  changeHatEligibilityCallData({
    hatId,
    newEligibility,
  }: {
    hatId: bigint;
    newEligibility: Address;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "changeHatEligibility",
      args: [hatId, newEligibility],
    });

    return { functionName: "changeHatEligibility", callData };
  }

  /**
   * Return the call data for a changeHatToggle operation.
   *
   * @param hatId - Hat ID.
   * @param newToggle - The new toggle address. Zero address is not valid.
   * @returns An object containing the call data and the function name.
   */
  changeHatToggleCallData({
    hatId,
    newToggle,
  }: {
    hatId: bigint;
    newToggle: Address;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "changeHatToggle",
      args: [hatId, newToggle],
    });

    return { functionName: "changeHatToggle", callData };
  }

  /**
   * Return the call data for a changeHatImageURI operation.
   *
   * @param hatId - Hat ID.
   * @param newImageURI - The new image URI.
   * @returns An object containing the call data and the function name.
   */
  changeHatImageURICallData({
    hatId,
    newImageURI,
  }: {
    hatId: bigint;
    newImageURI: string;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "changeHatImageURI",
      args: [hatId, newImageURI],
    });

    return { functionName: "changeHatImageURI", callData };
  }

  /**
   * Return the call data for a changeHatMaxSupply operation.
   *
   * @param hatId - Hat ID.
   * @param newMaxSupply -New maximum supply for the hat.
   * @returns An object containing the call data and the function name.
   */
  changeHatMaxSupplyCallData({
    hatId,
    newMaxSupply,
  }: {
    hatId: bigint;
    newMaxSupply: number;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "changeHatMaxSupply",
      args: [hatId, newMaxSupply],
    });

    return { functionName: "changeHatMaxSupply", callData };
  }

  /**
   * Return the call data for a requestLinkTopHatToTree operation.
   *
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param requestedAdminHat - ID of the requested new admin hat.
   * @returns An object containing the call data and the function name.
   */
  requestLinkTopHatToTreeCallData({
    topHatDomain,
    requestedAdminHat,
  }: {
    topHatDomain: number;
    requestedAdminHat: bigint;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "requestLinkTopHatToTree",
      args: [topHatDomain, requestedAdminHat],
    });

    return { functionName: "requestLinkTopHatToTree", callData };
  }

  /**
   * Return the call data for a approveLinkTopHatToTree operation.
   *
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param newAdminHat - ID of the new admin hat.
   * @param newEligibility - Optional new eligibility for the linked tophat.
   * @param newToggle - Optional new toggle for the linked tophat.
   * @param newDetails - Optional new details for the linked tophat.
   * @param newImageURI - Optional new image URI for the linked tophat.
   * @returns An object containing the call data and the function name.
   */
  approveLinkTopHatToTreeCallData({
    topHatDomain,
    newAdminHat,
    newEligibility,
    newToggle,
    newDetails,
    newImageURI,
  }: {
    topHatDomain: number;
    newAdminHat: bigint;
    newEligibility?: Address;
    newToggle?: Address;
    newDetails?: string;
    newImageURI?: string;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "approveLinkTopHatToTree",
      args: [
        topHatDomain,
        newAdminHat,
        newEligibility === undefined ? ZERO_ADDRESS : newEligibility,
        newToggle === undefined ? ZERO_ADDRESS : newToggle,
        newDetails === undefined ? "" : newDetails,
        newImageURI === undefined ? "" : newImageURI,
      ],
    });

    return { functionName: "approveLinkTopHatToTree", callData };
  }

  /**
   * Return the call data for a unlinkTopHatFromTree operation.
   *
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param wearer - The current wearer of the tophat that is about to be unlinked.
   * @returns An object containing the call data and the function name.
   */
  unlinkTopHatFromTreeCallData({
    topHatDomain,
    wearer,
  }: {
    topHatDomain: number;
    wearer: Address;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "unlinkTopHatFromTree",
      args: [topHatDomain, wearer],
    });

    return { functionName: "unlinkTopHatFromTree", callData };
  }

  /**
   * Return the call data for a relinkTopHatWithinTree operation.
   *
   * @param topHatDomain - The tree domain of the requesting tree. The tree domain is the first four bytes of the tophat ID.
   * @param newAdminHat - ID of the new admin hat.
   * @param newEligibility - Optional new eligibility for the linked tophat.
   * @param newToggle - Optional new toggle for the linked tophat.
   * @param newDetails - Optional new details for the linked tophat.
   * @param newImageURI - Optional new image URI for the linked tophat.
   * @returns An object containing the call data and the function name.
   */
  relinkTopHatWithinTreeCallData({
    topHatDomain,
    newAdminHat,
    newEligibility,
    newToggle,
    newDetails,
    newImageURI,
  }: {
    topHatDomain: number;
    newAdminHat: bigint;
    newEligibility?: Address;
    newToggle?: Address;
    newDetails?: string;
    newImageURI?: string;
  }): {
    functionName: string;
    callData: Hex;
  } {
    const callData = encodeFunctionData({
      abi: HATS_ABI,
      functionName: "relinkTopHatWithinTree",
      args: [
        topHatDomain,
        newAdminHat,
        newEligibility === undefined ? ZERO_ADDRESS : newEligibility,
        newToggle === undefined ? ZERO_ADDRESS : newToggle,
        newDetails === undefined ? "" : newDetails,
        newImageURI === undefined ? "" : newImageURI,
      ],
    });

    return { functionName: "relinkTopHatWithinTree", callData };
  }

  /**
   * Get the call data to copy a tree's hats and wearers.
   * Note: this doensn't include the target's top-hat. The target top-hat should be created separately.
   *
   * @param sourceTree - The source tree domain.
   * @param targetTree - The target tree domain.
   * @returns An array of call data objects. Passing the result to the multicall function will execute the copy operation.
   */
  async copyTreeCallData({
    sourceTree,
    targetTree,
  }: {
    sourceTree: number;
    targetTree: number;
  }): Promise<
    {
      functionName: string;
      callData: Hex;
    }[]
  > {
    if (this._graphqlClient === undefined) {
      throw new Error("Subgraph client was not initialized");
    }

    const res: {
      functionName: string;
      callData: Hex;
    }[] = [];
    const tree = await this._graphqlClient.getTree({
      chainId: this.chainId,
      treeId: sourceTree,
      props: {
        hats: {
          details: true,
          maxSupply: true,
          imageUri: true,
          currentSupply: true,
          levelAtLocalTree: true,
          eligibility: true,
          toggle: true,
          mutable: true,
          createdAt: true,
          wearers: {},
          admin: {},
        },
        childOfTree: {},
        linkedToHat: {},
        parentOfTrees: {},
      },
    });

    const targetTreeHex = treeIdDecimalToHex(targetTree);

    tree.hats?.forEach((hat, index) => {
      if (index !== 0 && hat.createdAt !== null) {
        const adminID = hatIdHexToDecimal(
          targetTreeHex + hat.admin?.id.substring(10)
        );
        const createHatCall = this.createHatCallData({
          admin: adminID,
          details: hat.details as string,
          maxSupply: +(hat.maxSupply as string),
          eligibility: hat.eligibility as `0x${string}`,
          toggle: hat.toggle as `0x${string}`,
          mutable: hat.mutable as boolean,
          imageURI: hat.imageUri as string,
        });
        res.push({
          functionName: "createHat",
          callData: createHatCall.callData,
        });

        hat.wearers?.forEach((wearer) => {
          const mintHatCall = this.mintHatCallData({
            hatId: hatIdHexToDecimal(targetTreeHex + hat.id.substring(10)),
            wearer: wearer.id as `0x${string}`,
          });
          res.push({ functionName: "mintHat", callData: mintHatCall.callData });
        });
      }
    });

    return res;
  }

  /*//////////////////////////////////////////////////////////////
                      Validation Functions
    //////////////////////////////////////////////////////////////*/

  protected async _validateHatCreation({
    account,
    admin,
    eligibility,
    toggle,
  }: {
    account: Account | Address;
    admin: bigint;
    eligibility: Address;
    toggle: Address;
  }) {
    if (eligibility === ZERO_ADDRESS) {
      throw new ZeroEligibilityError("Zero eligibility address not valid");
    }
    if (toggle === ZERO_ADDRESS) {
      throw new ZeroToggleError("Zero toggle address not valid");
    }

    const validHatId = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isValidHatId",
      args: [admin],
    });
    if (!validHatId) {
      throw new InvalidAdminError("Invalid admin ID");
    }

    const nextHatId = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "getNextId",
      args: [admin],
    });

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId: nextHatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }
  }

  protected async _validateHatMinting({
    account,
    hatId,
    wearer,
  }: {
    account: Account | Address;
    hatId: bigint;
    wearer: Address;
  }) {
    const hat = await this.viewHat(hatId);
    if (hat.maxSupply === 0) {
      throw new HatNotExistError("Hat does not exist");
    }
    if (hat.supply >= hat.maxSupply) {
      throw new AllHatsWornError("All hats are worn");
    }

    const isWearerEligible = await this.isEligible({ wearer, hatId });
    if (!isWearerEligible) {
      throw new NotEligibleError("Wearer is not eligible");
    }

    const isHatActive = await this.isActive(hatId);
    if (!isHatActive) {
      throw new NotActiveError("Hat is not active");
    }

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }

    const isAlreadyWearing = await this.isWearerOfHat({ wearer, hatId });
    if (isAlreadyWearing) {
      throw new AlreadyWearingError("Already wearing the hat");
    }
  }

  protected async _validateHatTransfer({
    account,
    hatId,
    from,
    to,
  }: {
    account: Account | Address;
    hatId: bigint;
    from: Address;
    to: Address;
  }) {
    const hat = await this.viewHat(hatId);
    const isTopHat = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isTopHat",
      args: [hatId],
    });
    if (!isTopHat && !hat.mutable) {
      throw new ImmutableHatError("Hat is immutable, transfer is not allowed");
    }

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }

    const isNewWearerEligible = await this.isEligible({ wearer: to, hatId });
    if (!isNewWearerEligible) {
      throw new NotEligibleError("New wearer is not eligible for the hat");
    }

    const isHatActive = await this.isActive(hatId);
    if (!isHatActive) {
      throw new NotActiveError("Hat is not active");
    }

    const isAlreadyWearing = await this.isWearerOfHat({ wearer: to, hatId });
    if (isAlreadyWearing) {
      throw new AlreadyWearingError("New wearer is already wearing the hat");
    }

    const isCurrentWearerEligible = await this.isEligible({
      wearer: from,
      hatId,
    });
    const isCurrentWearer = await this.isWearerOfHat({ wearer: from, hatId });
    if (isCurrentWearerEligible && !isCurrentWearer) {
      throw new NotWearerError("From address is not a wearer of the hat");
    }
  }

  protected async _validateHatEdit({
    account,
    hatId,
  }: {
    account: Account | Address;
    hatId: bigint;
  }) {
    const hat = await this.viewHat(hatId);
    if (!hat.mutable) {
      throw new ImmutableHatError("Hat is immutable, editing is not allowed");
    }

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }
  }

  protected async _validateHatEditOrTophat({
    account,
    hatId,
  }: {
    account: Account | Address;
    hatId: bigint;
  }) {
    const hat = await this.viewHat(hatId);
    const isTopHat = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "isTopHat",
      args: [hatId],
    });
    if (!isTopHat && !hat.mutable) {
      throw new ImmutableHatError("Hat is immutable, edit is not allowed");
    }

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }
  }

  protected async _validateMaxSupplyEdit({
    account,
    hatId,
    newMaxSupply,
  }: {
    account: Account | Address;
    hatId: bigint;
    newMaxSupply: number;
  }) {
    const hat = await this.viewHat(hatId);
    if (!hat.mutable) {
      throw new ImmutableHatError("Hat is immutable, editing is not allowed");
    }

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }

    if (newMaxSupply < hat.supply) {
      throw new InvalidMaxSupplyError(
        "New max supply cannot be lower than the current aupply of minted hats"
      );
    }
  }

  protected async _validateTopHatDomainAdmin({
    account,
    topHatDomain,
  }: {
    account: Account | Address;
    topHatDomain: number;
  }) {
    const topHatId = BigInt(treeIdDecimalToHex(topHatDomain).padEnd(66, "0"));

    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId: topHatId,
    });
    if (!isAdmin) {
      throw new NotAdminError("Not Admin");
    }
  }

  protected async _validateLinkage({
    account,
    topHatDomain,
    newAdminHat,
    newDetails,
    newImageURI,
  }: {
    account: Account | Address;
    topHatDomain: number;
    newAdminHat: bigint;
    newDetails?: string;
    newImageURI?: string;
  }) {
    let accountAddress: Address;
    if (typeof account === "object") {
      accountAddress = account.address;
    } else {
      accountAddress = account;
    }

    const isAdmin = await this.isAdminOfHat({
      user: accountAddress,
      hatId: newAdminHat,
    });
    const isWearer = await this.isWearerOfHat({
      wearer: accountAddress,
      hatId: newAdminHat,
    });
    if (!isAdmin && !isWearer) {
      throw new NotAdminOrWearerError("Not admin or wearer");
    }

    const noCircularLinkage = await this._publicClient.readContract({
      address: HATS_V1,
      abi: HATS_ABI,
      functionName: "noCircularLinkage",
      args: [topHatDomain, newAdminHat],
    });
    if (!noCircularLinkage) {
      throw new CircularLinkageError("Circular linkage not allowed");
    }

    const linkedAdmin = await this.getLinkedTreeAdmin(topHatDomain);
    if (linkedAdmin > 0) {
      const tippyTopHatDomain = await this.getTippyTopHatDomain(topHatDomain);
      const tippyTopHatId = BigInt(
        treeIdDecimalToHex(tippyTopHatDomain).padEnd(66, "0")
      );

      const isWearerTippy = await this.isWearerOfHat({
        wearer: accountAddress,
        hatId: tippyTopHatId,
      });
      if (!isWearerTippy) {
        const destLocalTopHatDomain = await this._publicClient.readContract({
          address: HATS_V1,
          abi: HATS_ABI,
          functionName: "getTopHatDomain",
          args: [newAdminHat],
        });
        const destLocalTopHatId = BigInt(
          treeIdDecimalToHex(destLocalTopHatDomain).padEnd(66, "0")
        );

        const originalLocalTopHatDomain = await this._publicClient.readContract(
          {
            address: HATS_V1,
            abi: HATS_ABI,
            functionName: "getTopHatDomain",
            args: [linkedAdmin],
          }
        );
        const originalLocalTopHatId = BigInt(
          treeIdDecimalToHex(originalLocalTopHatDomain).padEnd(66, "0")
        );

        if (
          destLocalTopHatId !== originalLocalTopHatId &&
          destLocalTopHatId !== tippyTopHatId
        ) {
          throw new CrossLinkageError("Cross tree linkage not allowed");
        }
      } else {
        const sameTippyTophat = await this._publicClient.readContract({
          address: HATS_V1,
          abi: HATS_ABI,
          functionName: "sameTippyTopHatDomain",
          args: [topHatDomain, newAdminHat],
        });

        if (!sameTippyTophat) {
          throw new CrossLinkageError("Cross tree linkage not allowed");
        }
      }
    }

    if (newDetails !== undefined && newDetails.length > 7000) {
      throw new StringTooLongError("Details field max length is 7000");
    }

    if (newImageURI !== undefined && newImageURI.length > 7000) {
      throw new StringTooLongError("Image URI field max length is 7000");
    }
  }
}