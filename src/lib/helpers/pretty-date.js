export const prettyPrintDate = (date, options) => {
  if (options?.includeTime) return new Date(date).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (options?.shortMonth) return new Date(date).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
  else return new Date(date).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
}
