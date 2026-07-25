export function formatXlmBalance(balance: string): string {
  const [integer, fraction] = balance.split('.')
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined
    ? groupedInteger
    : `${groupedInteger}.${fraction}`
}
