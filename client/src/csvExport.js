export function downloadCsv(filename, headers, rows) {
  function escapeCell(value) {
    if (value === null || value === undefined) {
      return ''
    }
    const text = String(value)
    if (/[;"\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [
    headers.map(escapeCell).join(';'),
    ...rows.map((row) => row.map(escapeCell).join(';')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
