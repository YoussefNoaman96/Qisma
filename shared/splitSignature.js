export function splitSignature({ members, expenses }) {
  return JSON.stringify({
    members: members.map(({ id, name }) => [id, name]),
    expenses: expenses.map(({ id, amount, payerId, description, createdAt }) => [
      id,
      amount,
      payerId,
      description,
      createdAt,
    ]),
  });
}
