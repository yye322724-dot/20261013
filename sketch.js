// Google 試算表 CSV 網址
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7-rDjhtPyitOTy60fnUXkI4lbBFmrEY7VlCH1L7KfR6s-Hha7lN42K-RBiLyfkzCIqnJB6Eo9iV9_/pub?gid=1960587646&single=true&output=csv";

// 每回合抽出的題目數量
const QUESTIONS_PER_ROUND = 5;

// Google Fonts
const CHINESE_FONT = "Noto Serif TC";
const ENGLISH_FONT = "Isometra, sans-serif";

// 題庫資料
let questionBank = [];

// 本回合題目
let selectedQuestions = [];

// 測驗狀態
let currentQuestion = 0;
let correctCount = 0;
let selectedOption = -1;
let hasAnswered = false;
let isWrong = false;

// 載入狀態
let isLoading = true;
let loadError = "";

// 版面設定
let contentX = 0;
let contentWidth = 0;

let optionHeight = 55;
let optionGap = 12;
let optionStartY = 220;

// 下一題按鈕
let nextX = 0;
let nextY = 0;
const nextWidth = 180;
const nextHeight = 50;

// 重新開始按鈕
let restartX = 0;
let restartY = 0;
const restartWidth = 210;
const restartHeight = 50;


// 初始化
function setup() {
  createCanvas(windowWidth, windowHeight);

  textAlign(CENTER, CENTER);
  rectMode(CORNER);

  updateLayout();

  // 直接讀取 Google 試算表
  loadGoogleSheet();
}


// 讀取 Google 試算表
function loadGoogleSheet() {
  isLoading = true;
  loadError = "";

  // 加上時間參數，避免瀏覽器使用舊快取
  const url =
    GOOGLE_SHEET_CSV_URL +
    "&cacheBust=" +
    new Date().getTime();

  loadStrings(
    url,
    function (lines) {
      try {
        questionBank = parseCSV(lines);

        if (questionBank.length < QUESTIONS_PER_ROUND) {
          loadError =
            "題庫至少需要 " +
            QUESTIONS_PER_ROUND +
            " 題，目前讀取到 " +
            questionBank.length +
            " 題。";

          isLoading = false;
          return;
        }

        createNewRound();
        isLoading = false;
      } catch (error) {
        loadError =
          "題庫格式錯誤：" +
          error.message;

        isLoading = false;
      }
    },
    function () {
      loadError =
        "無法讀取 Google 試算表，請確認試算表已發布為 CSV。";

      isLoading = false;
    }
  );
}


// 解析 CSV
function parseCSV(lines) {
  if (!lines || lines.length === 0) {
    throw new Error("CSV 沒有資料。");
  }

  const rows = [];

  for (const line of lines) {
    if (line.trim() !== "") {
      rows.push(parseCSVLine(line));
    }
  }

  if (rows.length < 2) {
    throw new Error("CSV 題目不足。");
  }

  const headers = rows[0].map((header) =>
    header.trim()
  );

  const requiredHeaders = [
    "id",
    "question",
    "option1",
    "option2",
    "option3",
    "option4",
    "answer"
  ];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(
        "缺少欄位：" + header
      );
    }
  }

  const idIndex = headers.indexOf("id");
  const questionIndex = headers.indexOf("question");
  const option1Index = headers.indexOf("option1");
  const option2Index = headers.indexOf("option2");
  const option3Index = headers.indexOf("option3");
  const option4Index = headers.indexOf("option4");
  const answerIndex = headers.indexOf("answer");

  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (row.length < headers.length) {
      continue;
    }

    const question = row[questionIndex].trim();

    const options = [
      row[option1Index].trim(),
      row[option2Index].trim(),
      row[option3Index].trim(),
      row[option4Index].trim()
    ];

    const answer = parseInt(
      row[answerIndex].trim(),
      10
    );

    // 忽略空白題目與錯誤資料
    if (
      question === "" ||
      options.some(
        (option) =>
          option === "" ||
          option === "#ERROR!"
      ) ||
      isNaN(answer) ||
      answer < 0 ||
      answer > 3
    ) {
      continue;
    }

    result.push({
      id: row[idIndex].trim(),
      question: question,
      options: options,
      answer: answer
    });
  }

  return result;
}


// 解析 CSV 單行
function parseCSVLine(line) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];

    if (character === '"') {
      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {
        value += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (
      character === "," &&
      !insideQuotes
    ) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);

  return values;
}


// 隨機抽出五題
function createNewRound() {
  selectedQuestions = shuffle(
    questionBank.slice()
  ).slice(0, QUESTIONS_PER_ROUND);

  currentQuestion = 0;
  correctCount = 0;
  selectedOption = -1;
  hasAnswered = false;
  isWrong = false;
}


// 主繪圖函式
function draw() {
  background(244, 245, 251);

  updateLayout();

  if (isLoading) {
    drawCenteredText(
      "正在讀取 Google 試算表題庫……",
      width / 2,
      height / 2,
      CHINESE_FONT,
      24,
      color(37, 40, 73),
      NORMAL
    );

    return;
  }

  if (loadError !== "") {
    drawError();
    return;
  }

  if (
    currentQuestion >= selectedQuestions.length
  ) {
    drawResult();
    return;
  }

  drawHeader();
  drawQuestion();
  drawOptions();

  if (hasAnswered) {
    drawNextButton();
  }
}


// 設定版面
function updateLayout() {
  contentWidth = Math.min(width - 80, 720);
  contentX = (width - contentWidth) / 2;

  if (height < 650) {
    optionHeight = 45;
    optionGap = 8;
    optionStartY = 185;
  } else {
    optionHeight = 55;
    optionGap = 12;
    optionStartY = 220;
  }

  nextX = (width - nextWidth) / 2;

  nextY =
    optionStartY +
    4 * (optionHeight + optionGap) +
    10;
}


// 置中文字
function drawCenteredText(
  message,
  centerX,
  centerY,
  fontName,
  fontSize,
  fontColor,
  fontStyle
) {
  push();

  textAlign(CENTER, CENTER);
  textFont(fontName);
  textSize(fontSize);
  textStyle(fontStyle);
  fill(fontColor);
  noStroke();

  text(message, centerX, centerY);

  pop();
}


// 錯誤畫面
function drawError() {
  drawCenteredText(
    "題庫載入失敗",
    width / 2,
    height / 2 - 50,
    CHINESE_FONT,
    28,
    color(190, 70, 70),
    BOLD
  );

  drawCenteredText(
    loadError,
    width / 2,
    height / 2 + 20,
    CHINESE_FONT,
    16,
    color(80, 80, 100),
    NORMAL
  );
}


// 標題
function drawHeader() {
  drawCenteredText(
    "程式設計簡易指令測驗",
    width / 2,
    40,
    CHINESE_FONT,
    28,
    color(37, 40, 73),
    BOLD
  );

  drawCenteredText(
    "第 " +
      (currentQuestion + 1) +
      " 題 / 共 " +
      selectedQuestions.length +
      " 題",
    width / 2,
    78,
    CHINESE_FONT,
    16,
    color(104, 107, 136),
    NORMAL
  );
}


// 題目
function drawQuestion() {
  const question =
    selectedQuestions[currentQuestion].question;

  drawCenteredText(
    question,
    width / 2,
    145,
    CHINESE_FONT,
    20,
    color(37, 40, 73),
    BOLD
  );
}


// 答案選項
function drawOptions() {
  const currentData =
    selectedQuestions[currentQuestion];

  for (let i = 0; i < 4; i++) {
    let y =
      optionStartY +
      i * (optionHeight + optionGap);

    if (
      hasAnswered &&
      isWrong &&
      i === currentData.answer
    ) {
      y += Math.sin(millis() * 0.01) * 8;
    }

    if (
      hasAnswered &&
      !isWrong &&
      i === selectedOption
    ) {
      fill(88, 184, 137);
    } else if (
      hasAnswered &&
      isWrong &&
      i === currentData.answer
    ) {
      fill("#6d72c3");
    } else if (
      hasAnswered &&
      isWrong &&
      i === selectedOption
    ) {
      fill(229, 139, 139);
    } else {
      fill(255);
    }

    stroke(201, 203, 224);
    strokeWeight(2);

    rect(
      contentX,
      y,
      contentWidth,
      optionHeight,
      10
    );

    const answerColor =
      hasAnswered &&
      isWrong &&
      i === currentData.answer
        ? color(255)
        : color(37, 40, 73);

    drawCenteredText(
      currentData.options[i],
      contentX + contentWidth / 2,
      y + optionHeight / 2,
      ENGLISH_FONT,
      17,
      answerColor,
      NORMAL
    );
  }
}


// 下一題按鈕
function drawNextButton() {
  fill(37, 40, 73);
  stroke(37, 40, 73);
  strokeWeight(2);

  rect(
    nextX,
    nextY,
    nextWidth,
    nextHeight,
    10
  );

  const buttonText =
    currentQuestion ===
    selectedQuestions.length - 1
      ? "查看結果"
      : "下一題";

  drawCenteredText(
    buttonText,
    nextX + nextWidth / 2,
    nextY + nextHeight / 2,
    CHINESE_FONT,
    17,
    color(255),
    BOLD
  );
}


// 結果畫面
function drawResult() {
  drawCenteredText(
    "測驗完成！",
    width / 2,
    height / 2 - 100,
    CHINESE_FONT,
    34,
    color(37, 40, 73),
    BOLD
  );

  drawCenteredText(
    "你答對了 " +
      correctCount +
      " / " +
      selectedQuestions.length +
      " 題",
    width / 2,
    height / 2 - 40,
    CHINESE_FONT,
    28,
    color("#6d72c3"),
    BOLD
  );

  restartX = (width - restartWidth) / 2;
  restartY = height / 2 + 30;

  fill(37, 40, 73);
  stroke(37, 40, 73);
  strokeWeight(2);

  rect(
    restartX,
    restartY,
    restartWidth,
    restartHeight,
    10
  );

  drawCenteredText(
    "重新開始測驗",
    restartX + restartWidth / 2,
    restartY + restartHeight / 2,
    CHINESE_FONT,
    17,
    color(255),
    BOLD
  );
}


// 判斷滑鼠是否在矩形內
function isInside(x, y, w, h) {
  return (
    mouseX >= x &&
    mouseX <= x + w &&
    mouseY >= y &&
    mouseY <= y + h
  );
}


// 滑鼠點擊
function mousePressed() {
  if (isLoading || loadError !== "") {
    return;
  }

  // 測驗完成後重新抽題
  if (
    currentQuestion >= selectedQuestions.length
  ) {
    if (
      isInside(
        restartX,
        restartY,
        restartWidth,
        restartHeight
      )
    ) {
      loadGoogleSheet();
    }

    return;
  }

  const currentData =
    selectedQuestions[currentQuestion];

  // 選擇答案
  if (!hasAnswered) {
    for (let i = 0; i < 4; i++) {
      const y =
        optionStartY +
        i * (optionHeight + optionGap);

      if (
        isInside(
          contentX,
          y,
          contentWidth,
          optionHeight
        )
      ) {
        selectedOption = i;
        hasAnswered = true;
        isWrong =
          selectedOption !== currentData.answer;

        if (!isWrong) {
          correctCount++;
        }

        break;
      }
    }

    return;
  }

  // 下一題
  if (
    isInside(
      nextX,
      nextY,
      nextWidth,
      nextHeight
    )
  ) {
    currentQuestion++;
    selectedOption = -1;
    hasAnswered = false;
    isWrong = false;
  }
}


// 視窗尺寸改變
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}