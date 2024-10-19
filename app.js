const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/generate-labels', (req, res) => {
  const { inputType, inputValue, labelSize } = req.body;
  let labels = [];

  if (inputType === 'array') {
    labels = inputValue.split(',').map(item => item.trim());
  } else {
    const match = inputValue.match(/^([a-zA-Z]*)(\d+)-\1?(\d+)$/);
    if (match) {
      const prefix = match[1];
      const start = parseInt(match[2]);
      const end = parseInt(match[3]);
      const padLength = Math.max(match[2].length, match[3].length);
      
      labels = Array.from({length: end - start + 1}, (_, i) => {
        const number = (start + i).toString().padStart(padLength, '0');
        return `${prefix}${number}`;
      });
    } else {
      labels = [inputValue];
    }
  }

  const labelWidth = labelSize === '4x6' ? 288 : 72; // 4 inches = 288 points, 1 inch = 72 points
  const labelHeight = labelSize === '4x6' ? 432 : 144; // 6 inches = 432 points, 2 inches = 144 points

  const doc = new PDFDocument({ size: [labelWidth, labelHeight] });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=labels.pdf');

  doc.pipe(res);

  labels.forEach((label, index) => {
    if (index > 0) {
      doc.addPage({ size: [labelWidth, labelHeight] });
    }

    doc.rect(0, 0, labelWidth, labelHeight).stroke();

    // Calculate font size based on label dimensions and text length
    const maxFontSize = Math.min(labelWidth, labelHeight) * 0.8;
    let fontSize = maxFontSize;
    doc.fontSize(fontSize);

    while (doc.widthOfString(label) > labelWidth - 20 || doc.heightOfString(label) > labelHeight - 20) {
      fontSize--;
      doc.fontSize(fontSize);
      if (fontSize <= 1) break; // Prevent infinite loop for extremely long text
    }

    // Center the text in the label
    const textWidth = doc.widthOfString(label);
    const textHeight = doc.heightOfString(label);
    const textX = (labelWidth - textWidth) / 2;
    const textY = (labelHeight - textHeight) / 2;

    doc.text(label, textX, textY, {
      width: labelWidth,
      height: labelHeight,
      align: 'center',
      valign: 'center'
    });
  });

  doc.end();
});

app.listen(port, () => {
  console.log(`Label generator app listening at http://localhost:${port}`);
});
