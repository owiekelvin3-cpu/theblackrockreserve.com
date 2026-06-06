export const DEPOSIT_SUCCESS_MESSAGE =
  "Thank you for submitting your deposit request. Our team will verify the Bitcoin transaction and process it as soon as confirmation is received on the blockchain. Once approved, the funds will be credited to your account balance. This process may take a short time depending on network confirmations. You will be notified once your deposit has been approved.";

export function formatDepositStatus(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending Approval";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}
