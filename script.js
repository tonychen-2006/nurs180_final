const form = document.getElementById("selfCareForm");
const weekNumber = document.getElementById("weekNumber");
const courseTheme = document.getElementById("courseTheme");
const evidenceImage = document.getElementById("evidenceImage");
const imagePreview = document.getElementById("imagePreview");
const receiptPreview = document.getElementById("receiptPreview");
const receiptGallery = document.getElementById("receiptGallery");
const loadSampleButton = document.getElementById("loadSampleButton");
const downloadAllButton = document.getElementById("downloadAllButton");

const totalSessions = document.getElementById("totalSessions");
const totalMinutes = document.getElementById("totalMinutes");
const averageStress = document.getElementById("averageStress");
const averageEnergy = document.getElementById("averageEnergy");
const commonDomain = document.getElementById("commonDomain");

let receipts = [];
let uploadedImageData = "";
let latestReceipt = null;

// Week-to-theme mapping for the six course modules.
const weekThemes = {
  1: "Wellness, Stress & Resilience; Six Domains of Self-Care",
  2: "Academic Wellbeing & Physiology of Stress",
  3: "Physical Exercise, Nutrition & Stress; Psychology of Stress Part 1",
  4: "Time & Resource Management; Comparing Minds, Social Justice & Diversity",
  5: "Cognitive Restructuring/Reframing; Spirituality & Personal Philosophy",
  6: "Mindfulness, Nature & Our Health; Creative Expression"
};

const receiptCodes = {
  Physical: "MOVEMENT",
  Emotional: "REFRAME",
  Social: "CONNECT",
  Spiritual: "MEANING",
  "Academic/Professional": "FOCUS",
  Personal: "RESET"
};

const TIME_TAX_MINUTES = 15;
const TIME_TAX_SOURCE = "Stress + poor sleep + overthinking";

function updateTheme() {
  courseTheme.value = weekThemes[weekNumber.value];
}

function getReturnMessage(stressReduction, energyIncrease) {
  if (stressReduction >= 3 && energyIncrease >= 3) {
    return "Major reset: stress dropped and energy noticeably returned.";
  }

  if (stressReduction > 0 && energyIncrease > 0) {
    return "Balanced return: calmer body, clearer energy.";
  }

  if (stressReduction > 0) {
    return "Stress relief received: pressure moved in the right direction.";
  }

  if (energyIncrease > 0) {
    return "Energy credit received: capacity increased after care.";
  }

  return "Reflection logged: awareness built for the next self-care choice.";
}

function createReceiptId(week, domain) {
  const code = receiptCodes[domain] || "CARE";
  return `W${week}-${code}`;
}

function createReceiptKey() {
  return `receipt-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function getTimeTaxMinutes(receipt) {
  return Number.isFinite(receipt.timeTaxMinutes) ? receipt.timeTaxMinutes : TIME_TAX_MINUTES;
}

function getNetHealthMinutes(receipt) {
  return Math.max(receipt.minutes - getTimeTaxMinutes(receipt), 0);
}

function formatReceiptDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Receipt generation: returns the full receipt-style HTML card used in preview, gallery, and PDF printing.
function generateReceiptCard(receipt) {
  const imagePosition = receipt.imagePosition || "center center";
  const timeTaxMinutes = getTimeTaxMinutes(receipt);
  const netHealthMinutes = getNetHealthMinutes(receipt);

  return `
    <article class="receipt-card">
      <div class="receipt-title">SELF-CARE</div>
      <div class="receipt-subtitle">PAYMENT RECEIPT</div>
      <hr class="receipt-rule">
      <div class="receipt-meta">
        <div><span>Invoice:</span> ${escapeHtml(receipt.id)}</div>
        <div><span>Date:</span> ${formatReceiptDate(receipt.createdAt)}</div>
        <div><span>Account:</span> NURS180</div>
        <div><span>Type:</span> WEEKLY</div>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-block">
        <div><span>Week:</span> Week ${receipt.week}</div>
        <div><span>Theme:</span> ${escapeHtml(receipt.theme)}</div>
        <div><span>Activity:</span> ${escapeHtml(receipt.activity)}</div>
        <div><span>Domain:</span> ${escapeHtml(receipt.domain)}</div>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-totals">
        <div><span>HEALTH TIME</span><strong>${receipt.minutes} MIN</strong></div>
        <div><span>TIME TAX</span><strong>-${timeTaxMinutes} MIN</strong></div>
        <div><span>STRESS</span><strong>${receipt.stressBefore} &rarr; ${receipt.stressAfter}</strong></div>
        <div><span>ENERGY</span><strong>${receipt.energyBefore} &rarr; ${receipt.energyAfter}</strong></div>
        <div class="receipt-grand-total"><span>TOTAL PAID</span><strong>${netHealthMinutes} MIN</strong></div>
      </div>
      <hr class="receipt-rule">
      <div class="receipt-table-head">
        <span>Field</span>
        <span>Value</span>
      </div>
      <hr class="receipt-divider">
      <div class="receipt-table">
        <div><span>Stress Reduction</span><strong>${receipt.stressReduction}</strong></div>
        <div><span>Energy Increase</span><strong>${receipt.energyIncrease}</strong></div>
        <div><span>Time Tax Source</span><strong>${escapeHtml(TIME_TAX_SOURCE)}</strong></div>
        <div><span>Return Received</span><strong>${escapeHtml(receipt.returnReceived)}</strong></div>
      </div>
      <img class="evidence-image" src="${receipt.image}" alt="Evidence for ${escapeHtml(receipt.activity)}" style="object-position: ${imagePosition};">
      <div class="receipt-reflection">
        <span>Reflection</span>
        <p>${escapeHtml(receipt.reflection)}</p>
      </div>
      <hr class="receipt-divider">
      <p class="receipt-status">SELF-CARE LOGGED</p>
      <p class="receipt-footer">Self-care logged. Balance restored.</p>
    </article>
  `;
}

function pdfText(value) {
  return String(value)
    .replace(/[→]/g, "->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value, maxLength) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;

    if (nextLine.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function imageToJpegData(receiptImage) {
  return new Promise((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => {
      try {
        const width = 430;
        const height = 170;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const sourceRatio = image.naturalWidth / image.naturalHeight;
        const targetRatio = width / height;
        let sourceWidth = image.naturalWidth;
        let sourceHeight = image.naturalHeight;
        let sourceX = 0;
        let sourceY = 0;

        if (sourceRatio > targetRatio) {
          sourceWidth = image.naturalHeight * targetRatio;
          sourceX = (image.naturalWidth - sourceWidth) / 2;
        } else {
          sourceHeight = image.naturalWidth / targetRatio;
          sourceY = (image.naturalHeight - sourceHeight) / 2;
        }

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#fbfaf5";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

        resolve({
          bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.86)),
          width,
          height
        });
      } catch (error) {
        resolve(null);
      }
    });

    image.addEventListener("error", () => resolve(null));
    image.src = receiptImage;
  });
}

function makePdfStream(content) {
  return `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
}

function createPdfBytes(receiptList, imageList) {
  const encoder = new TextEncoder();
  const objects = [];

  function toBytes(value) {
    return typeof value === "string" ? encoder.encode(value) : value;
  }

  function addObject(parts) {
    objects.push(Array.isArray(parts) ? parts.map(toBytes) : [toBytes(parts)]);
    return objects.length;
  }

  const catalogId = addObject("");
  const pagesId = addObject("");
  const helveticaId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const helveticaBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const courierId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  const pageIds = [];

  function textLine(x, y, text, size = 10, font = "F3") {
    return `BT 0.12 0.11 0.10 rg /${font} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET\n`;
  }

  function centeredText(y, text, size = 28, font = "F2") {
    const x = Math.max(72, (612 - String(text).length * size * 0.56) / 2);
    return textLine(x, y, text, size, font);
  }

  receiptList.forEach((receipt, index) => {
    let content = "";
    let y = 720;
    const imageData = imageList[index];
    let imageId = null;
    const timeTaxMinutes = getTimeTaxMinutes(receipt);
    const netHealthMinutes = getNetHealthMinutes(receipt);

    if (imageData) {
      imageId = addObject([
        `<< /Type /XObject /Subtype /Image /Width ${imageData.width} /Height ${imageData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageData.bytes.length} >>\nstream\n`,
        imageData.bytes,
        "\nendstream"
      ]);
    }

    content += "0.98 0.97 0.94 rg 0 0 612 792 re f\n";
    content += "1 0.99 0.96 rg 76 36 460 720 re f\n";
    content += "0.12 0.11 0.10 RG 1 w 76 36 460 720 re S\n";
    content += centeredText(y, "SELF-CARE", 32, "F2");
    y -= 36;
    content += centeredText(y, "PAYMENT RECEIPT", 15, "F3");
    y -= 34;
    content += `106 ${y} m 506 ${y} l S\n`;
    y -= 34;
    content += textLine(106, y, `Invoice: ${receipt.id}`, 11, "F2");
    content += textLine(345, y, `Date: ${formatReceiptDate(receipt.createdAt)}`, 11, "F2");
    y -= 20;
    content += textLine(106, y, "Account: NURS180", 11, "F2");
    content += textLine(345, y, "Type: WEEKLY", 11, "F2");
    y -= 30;
    content += "[5 5] 0 d 106 " + y + " m 506 " + y + " l S [] 0 d\n";
    y -= 28;

    [
      `Week: Week ${receipt.week}`,
      `Theme: ${receipt.theme}`,
      `Activity: ${receipt.activity}`,
      `Domain: ${receipt.domain}`
    ].forEach((line) => {
      wrapText(line, 54).forEach((wrappedLine) => {
        content += textLine(106, y, wrappedLine, 10, "F3");
        y -= 15;
      });
    });

    y -= 10;
    content += "[5 5] 0 d 106 " + y + " m 506 " + y + " l S [] 0 d\n";
    y -= 28;
    content += textLine(250, y, "HEALTH TIME", 12, "F3");
    content += textLine(440, y, `${receipt.minutes} MIN`, 12, "F2");
    y -= 18;
    content += textLine(250, y, "TIME TAX", 12, "F3");
    content += textLine(440, y, `-${timeTaxMinutes} MIN`, 12, "F2");
    y -= 18;
    content += textLine(250, y, "STRESS", 12, "F3");
    content += textLine(452, y, `${receipt.stressBefore} -> ${receipt.stressAfter}`, 12, "F2");
    y -= 18;
    content += textLine(250, y, "ENERGY", 12, "F3");
    content += textLine(452, y, `${receipt.energyBefore} -> ${receipt.energyAfter}`, 12, "F2");
    y -= 22;
    content += textLine(250, y, "TOTAL PAID", 13, "F2");
    content += textLine(440, y, `${netHealthMinutes} MIN`, 13, "F2");
    y -= 32;
    content += `106 ${y} m 506 ${y} l S\n`;
    y -= 26;
    content += textLine(106, y, "Field", 11, "F3");
    content += textLine(455, y, "Value", 11, "F3");
    y -= 24;
    content += "[5 5] 0 d 106 " + y + " m 506 " + y + " l S [] 0 d\n";
    y -= 28;
    content += textLine(106, y, "Stress Reduction", 10, "F2");
    content += textLine(470, y, receipt.stressReduction, 10, "F2");
    y -= 17;
    content += textLine(106, y, "Energy Increase", 10, "F2");
    content += textLine(470, y, receipt.energyIncrease, 10, "F2");
    y -= 17;
    content += textLine(106, y, "Time Tax Source", 10, "F2");
    content += textLine(302, y, TIME_TAX_SOURCE, 9, "F3");
    y -= 22;
    content += textLine(106, y, "Return Received", 10, "F2");
    y -= 16;
    wrapText(receipt.returnReceived, 58).forEach((line) => {
      content += textLine(106, y, line, 9, "F3");
      y -= 13;
    });

    if (imageId) {
      y -= 8;
      content += `q 430 0 0 170 91 ${y - 170} cm /Im1 Do Q\n`;
      content += "0.12 0.11 0.10 RG 1 w 91 " + (y - 170) + " 430 170 re S\n";
      y -= 194;
    }

    content += textLine(106, y, "Reflection", 10, "F2");
    y -= 16;
    wrapText(receipt.reflection, 62).forEach((line) => {
      content += textLine(106, y, line, 9, "F3");
      y -= 13;
    });
    y -= 16;
    content += "[5 5] 0 d 106 " + y + " m 506 " + y + " l S [] 0 d\n";
    y -= 28;
    content += centeredText(y, "SELF-CARE LOGGED", 13, "F3");
    y -= 26;
    content += centeredText(y, "Self-care logged. Balance restored.", 10, "F3");

    const resources = imageId
      ? `<< /Font << /F1 ${helveticaId} 0 R /F2 ${helveticaBoldId} 0 R /F3 ${courierId} 0 R >> /XObject << /Im1 ${imageId} 0 R >> >>`
      : `<< /Font << /F1 ${helveticaId} 0 R /F2 ${helveticaBoldId} 0 R /F3 ${courierId} 0 R >> >>`;
    const contentId = addObject(makePdfStream(content));
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources ${resources} /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = [encoder.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)];
  objects[pagesId - 1] = [encoder.encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`)];

  const chunks = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let byteLength = chunks[0].length;

  objects.forEach((parts, index) => {
    offsets.push(byteLength);
    const objectHeader = encoder.encode(`${index + 1} 0 obj\n`);
    const objectFooter = encoder.encode("\nendobj\n");
    chunks.push(objectHeader, ...parts, objectFooter);
    byteLength += objectHeader.length + parts.reduce((sum, part) => sum + part.length, 0) + objectFooter.length;
  });

  const xrefStart = byteLength;
  const xrefRows = offsets.map((offset, index) => {
    if (index === 0) {
      return "0000000000 65535 f \n";
    }

    return `${String(offset).padStart(10, "0")} 00000 n \n`;
  }).join("");
  const trailer = `xref\n0 ${objects.length + 1}\n${xrefRows}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  chunks.push(encoder.encode(trailer));

  return new Blob(chunks, { type: "application/pdf" });
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveReceiptsAsPdf(receiptList) {
  if (receiptList.length === 0) {
    alert("Add at least one receipt before saving as PDF.");
    return;
  }

  try {
    downloadAllButton.disabled = true;
    downloadAllButton.textContent = "Building PDF...";

    const images = await Promise.all(receiptList.map((receipt) => imageToJpegData(receipt.image)));
    const pdfBlob = createPdfBytes(receiptList, images);
    const filename = receiptList.length === 1
      ? `self-care-${receiptList[0].id}.pdf`.toLowerCase()
      : "tonys-self-care-receipts.pdf";

    downloadBlob(filename, pdfBlob);
  } catch (error) {
    alert("The PDF could not be created. Try reloading the page and saving again.");
  } finally {
    downloadAllButton.disabled = false;
    downloadAllButton.textContent = "Download All PDF";
  }
}

function generateGalleryCard(receipt) {
  return `
    <article class="gallery-card">
      <div class="gallery-card-top">
        <span>Week ${receipt.week}</span>
        <button class="secondary-button download-button" type="button" data-download-key="${receipt.key}">
          Download PDF
        </button>
      </div>
      ${generateReceiptCard(receipt)}
    </article>
  `;
}

function renderGallery() {
  if (receipts.length === 0) {
    receiptGallery.innerHTML = '<p class="gallery-empty">No receipts logged yet. Submit the form or load sample data.</p>';
    return;
  }

  receiptGallery.innerHTML = receipts.map(generateGalleryCard).join("");
}

function renderReceiptPreview(receipt, animate = false) {
  if (!receipt) {
    receiptPreview.innerHTML = "<p>Your latest receipt will print here after you submit the form.</p>";
    receiptPreview.className = "preview-empty";
    return;
  }

  receiptPreview.className = "receipt-stage";
  receiptPreview.innerHTML = generateReceiptCard(receipt);

  if (animate) {
    const card = receiptPreview.querySelector(".receipt-card");
    receiptPreview.classList.remove("is-printing");

    requestAnimationFrame(() => {
      receiptPreview.classList.add("is-printing");
      card.classList.add("print-animation");
    });
  }
}

function renderReceipts(animatePreview = false) {
  renderGallery();
  renderReceiptPreview(latestReceipt || receipts[receipts.length - 1], animatePreview);
}

// Summary calculations for total sessions, time, averages, and most common domain.
function updateSummary() {
  totalSessions.textContent = receipts.length;

  if (receipts.length === 0) {
    totalMinutes.textContent = "0 min";
    averageStress.textContent = "0.0";
    averageEnergy.textContent = "0.0";
    commonDomain.textContent = "None yet";
    return;
  }

  const minutes = receipts.reduce((sum, receipt) => sum + receipt.minutes, 0);
  const stressAverage = receipts.reduce((sum, receipt) => sum + receipt.stressReduction, 0) / receipts.length;
  const energyAverage = receipts.reduce((sum, receipt) => sum + receipt.energyIncrease, 0) / receipts.length;
  const domainCounts = receipts.reduce((counts, receipt) => {
    counts[receipt.domain] = (counts[receipt.domain] || 0) + 1;
    return counts;
  }, {});

  const mostCommonDomain = Object.entries(domainCounts)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))[0][0];

  totalMinutes.textContent = `${minutes} min`;
  averageStress.textContent = stressAverage.toFixed(1);
  averageEnergy.textContent = energyAverage.toFixed(1);
  commonDomain.textContent = mostCommonDomain;
}

function saveReceipt(receipt) {
  receipts.push(receipt);
  latestReceipt = receipt;
  receipts.sort((first, second) => first.week - second.week);
  renderReceipts(true);
  updateSummary();
}

// Image upload preview using FileReader so the static app can display local images.
evidenceImage.addEventListener("change", () => {
  const file = evidenceImage.files[0];

  if (!file) {
    uploadedImageData = "";
    imagePreview.innerHTML = "<span>Image preview will appear here.</span>";
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    uploadedImageData = reader.result;
    imagePreview.innerHTML = `<img src="${uploadedImageData}" alt="Uploaded evidence preview">`;
  });

  reader.readAsDataURL(file);
});

// Form submission: reads values, calculates changes, and saves the generated receipt.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!uploadedImageData) {
    imagePreview.innerHTML = "<span>Please upload an evidence image before generating a receipt.</span>";
    return;
  }

  const data = new FormData(form);
  const week = Number(data.get("weekNumber"));
  const stressBefore = Number(data.get("stressBefore"));
  const stressAfter = Number(data.get("stressAfter"));
  const energyBefore = Number(data.get("energyBefore"));
  const energyAfter = Number(data.get("energyAfter"));
  const stressReduction = stressBefore - stressAfter;
  const energyIncrease = energyAfter - energyBefore;
  const domain = data.get("domain");

  const receipt = {
    id: createReceiptId(week, domain),
    week,
    theme: weekThemes[week],
    activity: data.get("activity").trim(),
    domain,
    minutes: Number(data.get("minutes")),
    stressBefore,
    stressAfter,
    stressReduction,
    energyBefore,
    energyAfter,
    energyIncrease,
    timeTaxMinutes: TIME_TAX_MINUTES,
    returnReceived: getReturnMessage(stressReduction, energyIncrease),
    reflection: data.get("reflection").trim(),
    image: uploadedImageData,
    createdAt: new Date().toISOString(),
    key: createReceiptKey()
  };

  saveReceipt(receipt);
  form.reset();
  uploadedImageData = "";
  imagePreview.innerHTML = "<span>Image preview will appear here.</span>";
  updateTheme();
});

function sampleImage(label, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="#fffdf8"/>
      <rect x="36" y="36" width="728" height="378" rx="28" fill="${color}" opacity="0.18"/>
      <path d="M95 325 C190 215, 260 310, 350 220 S545 130, 705 260" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>
      <circle cx="210" cy="150" r="54" fill="${color}" opacity="0.72"/>
      <text x="400" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#2d2a26">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Sample data loading for quick demonstration of all six weekly receipts.
function loadSampleData() {
  const sampleLogs = [
    {
      week: 1,
      activity: "Took a sunset reset walk by the beach",
      domain: "Personal",
      minutes: 80,
      stressBefore: 7,
      stressAfter: 3,
      energyBefore: 4,
      energyAfter: 7,
      reflection: "Watching the sunset helped me slow down, notice my surroundings, and reset my mood as my day ended. This stroll calmed me down and helped me focus on my personal wellness.",
      image: "assets/tony-week1.jpeg"
    },
    {
      week: 2,
      activity: "Moved into my dorm and set new sleep routines and breathing patterns",
      domain: "Physical",
      minutes: 60,
      stressBefore: 8,
      stressAfter: 4,
      energyBefore: 3,
      energyAfter: 6,
      reflection: "Setting up my dorm made the space feel more settled. Creating a new sleep routine and using breathing patterns helped my body calm down before bed every evening. This way I can end my day right, as well as starting it.",
      image: "assets/tony-week2.jpeg"
    },
    {
      week: 3,
      activity: "Completed a gym session and a recovery meal",
      domain: "Physical",
      minutes: 75,
      stressBefore: 6,
      stressAfter: 3,
      energyBefore: 5,
      energyAfter: 8,
      reflection: "Lifting weights and working on cardio helped me turn mental stress into movement. Having a large meal afterward made this session feel like recovery instead of just exercise. This cleared my thoughts through physical activity and made me more active during the day.",
      image: "assets/tony-week3.jpeg",
      imagePosition: "center 33%"
    },
    {
      week: 4,
      activity: "Used cognitive blocking while working on engineering tasks during time confetti",
      domain: "Academic/Professional",
      minutes: 150,
      stressBefore: 8,
      stressAfter: 5,
      energyBefore: 4,
      energyAfter: 5,
      reflection: "Using the time confetti I had after elimating excessive electronic use during the day, I put that time to build electronic devices instead during my engineering work for my engineering student team.",
      image: "assets/tony-week4.jpeg",
      imagePosition: "center 45%"
    },
    {
      week: 5,
      activity: "Went to the library to write a cognitive reframing reflection",
      domain: "Emotional",
      minutes: 70,
      stressBefore: 7,
      stressAfter: 4,
      energyBefore: 4,
      energyAfter: 5,
      reflection: "Going to the library gave me a quieter space to slow down and write the reflection. Reframing allowed me separate facts from anxious predictions and leave with a clearer and stronger mindset.",
      image: "assets/tony-week5.jpeg",
      imagePosition: "center 56%"
    },
    {
      week: 6,
      activity: "Visited San Francisco and reflected on personal direction",
      domain: "Spiritual",
      minutes: 800,
      stressBefore: 6,
      stressAfter: 2,
      energyBefore: 5,
      energyAfter: 7,
      reflection: "I chose to vist San Francisco as it's always a goal of mine as I believe it's the place I belonged spiritually. This allowed me to gain wider view to  step outside regular stressors and think about where I am going, what matters, and what kind of life I hope to build.",
      image: "assets/tony-week6.jpeg",
      imagePosition: "center 55%"
    }
  ];

  receipts = sampleLogs.map((log, index) => {
    const stressReduction = log.stressBefore - log.stressAfter;
    const energyIncrease = log.energyAfter - log.energyBefore;

    return {
      ...log,
      id: createReceiptId(log.week, log.domain),
      theme: weekThemes[log.week],
      stressReduction,
      energyIncrease,
      timeTaxMinutes: TIME_TAX_MINUTES,
      returnReceived: getReturnMessage(stressReduction, energyIncrease),
      createdAt: new Date(2026, 4, 13 + index * 7).toISOString(),
      key: `sample-week-${log.week}`
    };
  });
  latestReceipt = receipts[receipts.length - 1];

  renderReceipts();
  updateSummary();
}

loadSampleButton.addEventListener("click", loadSampleData);

receiptGallery.addEventListener("click", (event) => {
  const button = event.target.closest("[data-download-key]");

  if (!button) {
    return;
  }

  const receipt = receipts.find((item) => item.key === button.dataset.downloadKey);

  if (receipt) {
    saveReceiptsAsPdf([receipt]);
  }
});

downloadAllButton.addEventListener("click", () => {
  saveReceiptsAsPdf(receipts);
});

weekNumber.addEventListener("change", updateTheme);
updateTheme();
updateSummary();

if (new URLSearchParams(window.location.search).get("sample") === "1") {
  loadSampleData();
}
