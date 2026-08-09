import http from 'node:http'
http
  .createServer((req, res) => {
    let b = ''
    req.on('data', (c) => (b += c))
    req.on('end', () => {
      let p = {}
      try { p = JSON.parse(b) } catch { /* noop */ }
      const content = 'Mock reply: plan is on the board. Next step — desk research on Stake, then we score it.'
      if (p.stream === true) {
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
      } else {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
            usage: { total_tokens: 30 },
          }),
        )
      }
    })
  })
  .listen(3999, () => console.log('MOCK_UP'))
