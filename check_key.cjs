const https = require('https');
https.get('https://evil0069.github.io/------------/', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const match = d.match(/index-.*\.js/);
    if (!match) return;
    const js = match[0];
    https.get('https://evil0069.github.io/------------/assets/' + js, r2 => {
      let j = '';
      r2.on('data', c => j += c);
      r2.on('end', () => {
        const keyMatch = j.match(/generateContent\?key=([^"`]*)/);
        console.log("Compiled Key URL:", keyMatch ? keyMatch[1] : "Not found");
      });
    });
  });
});
