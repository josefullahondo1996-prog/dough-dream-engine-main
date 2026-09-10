export type ExpenseInput = {
  amount: number;
};

export function sumExpenses(items: ExpenseInput[]) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
