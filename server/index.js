const express = require('express')

const app = express()
const PORT = 5000

app.get('/', (req, res) => {
  res.send('Leave and Absence Management API')
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Leave and Absence Management API is running',
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
