export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const parseCurrency = (value: string): number => {
  // Remove "R$", espaços, e pontos, substitui vírgula por ponto
  const cleaned = value
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')

  return parseFloat(cleaned)
}
