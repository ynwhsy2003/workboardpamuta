// === Firebase SDK ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";


// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDaGgUnaIXBBlNFGt8QTWpWhNnn1jCK1Ws",
  authDomain: "pamuta-workboard-ff04f.firebaseapp.com",
  projectId: "pamuta-workboard-ff04f",
  storageBucket: "pamuta-workboard-ff04f.appspot.com",
  messagingSenderId: "937347967797",
  appId: "1:937347967797:web:2adede917be4f3fd05ba7c",
  measurementId: "G-Y25821J8G0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Save card data to Firestore
async function saveCardToFirestore(cardData) {
  try {
    await addDoc(collection(db, "kanbanCards"), cardData);
    console.log("✅ บันทึกลง Firestore แล้ว");
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดขณะบันทึก:", error);
  }
  
}

async function loadCardsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "kanbanCards"));
    const columns = document.querySelectorAll(".column");
    columns.forEach(column => {
    const cards = column.querySelectorAll(".card");
cards.forEach(card => card.remove());

    });
    querySnapshot.forEach((doc) => {
      const cardData = doc.data();
      // สร้างการ์ดใหม่เหมือนเวลาสร้างจากฟอร์ม
      const card = document.createElement("div");
      const docId = doc.id;
      
      card.setAttribute("draggable", "true");
      card.setAttribute("data-firestore-id", doc.id);
     card.id = `card-${docId}`; // ใช้ id สำหรับ drop
      card.dataset.docId = docId; // ใช้กับ updateDoc ตอนลากแล้วปล่อย

      let deadlineClass = "";
      const today = new Date();
      const due = new Date(cardData.dueDate);
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 2) deadlineClass = "card-red";
      else if (diffDays <= 5) deadlineClass = "card-yellow";
      else deadlineClass = "card-green";

      card.className = `kanban-card ${deadlineClass}`;
      card.setAttribute("data-due-date", cardData.dueDate);

      card.innerHTML = `
        <div class="card-main">
          <p><strong>WORK ORDER:</strong> ${cardData.productCode}</p>
          <p><strong>EMPLOYEE:</strong> ${cardData.employeeName}</p>
          <button class="details-btn">ดูเพิ่มเติม</button>
        </div>
        <div class="card-details hidden">
          <p><strong>CUSTOMER:</strong> ${cardData.customerName}</p>
          <p><strong>PART NUMBER:</strong> ${cardData.productName}</p>
          <p><strong>QUANTITY:</strong> ${cardData.productNumber}</p>
          <p><strong>ORDER DATE:</strong> ${cardData.orderDate}</p>
          <p><strong>DELIVERY DATE:</strong> ${cardData.dueDate}</p>
          <p><strong>STATUS:</strong> ${cardData.status}</p>
          <p><strong>NOTE:</strong></p>
          <div class="editable-note" contenteditable="true">${cardData.remarks}</div>
          <button class="delete-btn">ลบการ์ด</button>
          <p><strong>เวลาที่ใช้:</strong> <span class="elapsed-time">${cardData.elapsedTime || "00:00:00"}</span></p>
          <button class="start-btn">เริ่ม</button>
          <button class="stop-btn">หยุด</button>
        </div>
      `;

    const targetColumn = document.querySelector(`.column[data-status="${cardData.status}"]`);
if (targetColumn) {
  targetColumn.appendChild(card);
} else {
  // ถ้าไม่เจอคอลัมน์สถานะนี้ ให้ไปที่คอลัมน์แรก (หรือจะเลือกวิธีจัดการอื่นก็ได้)
  document.querySelector(".column").appendChild(card);
  console.warn("ไม่พบคอลัมน์สำหรับสถานะ:", cardData.status);
}


      makeDraggable(card);
    });
    console.log("✅ โหลดการ์ดจาก Firestore เรียบร้อย");
  } catch (error) {
    console.error("❌ โหลดการ์ดล้มเหลว:", error);
  }
}


// Toggle details section on card
function toggleDetails(button) {
  const details = button.parentElement.nextElementSibling;
  const isHidden = details.classList.contains('hidden');

  if (isHidden) {
    details.classList.remove('hidden');
    button.textContent = 'ซ่อนข้อมูล';
  } else {
    details.classList.add('hidden');
    button.textContent = 'ดูเพิ่มเติม';
  }
}

// Make card draggable with delete, timer, and details toggle
function makeDraggable(card) {

  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", card.id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  // Delete button
const deleteBtn = card.querySelector(".delete-btn");
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    const confirmDelete = confirm("ยืนยันการลบการ์ด?");
    if (!confirmDelete) return;

    const docId = card.dataset.docId;
    if (docId) {
      try {
        await deleteDoc(doc(db, "kanbanCards", docId));
        card.remove();
        console.log("✅ ลบการ์ดเรียบร้อยจาก Firestore");
      } catch (error) {
        console.error("❌ ลบการ์ดล้มเหลว:", error);
      }
    }
  });
}


  // Timer setup
  let timer = null;
  let elapsed = 0;
  const timeDisplay = card.querySelector(".elapsed-time");
  const startBtn = card.querySelector(".start-btn");
  const stopBtn = card.querySelector(".stop-btn");

  if (startBtn && stopBtn && timeDisplay) {
    startBtn.addEventListener("click", () => {
      if (timer) return;
      const start = Date.now() - elapsed;
      timer = setInterval(() => {
        elapsed = Date.now() - start;
        timeDisplay.textContent = formatTime(elapsed);
      }, 1000);
    });

    stopBtn.addEventListener("click", () => {
      clearInterval(timer);
      timer = null;
    });
  }

  // Details toggle button
  const detailsBtn = card.querySelector(".details-btn");
  if (detailsBtn) {
    detailsBtn.addEventListener("click", () => {
      toggleDetails(detailsBtn);
    });
  }
    // Editable Note: Save to Firestore on blur
  const noteDiv = card.querySelector(".editable-note");
  if (noteDiv) {
    noteDiv.addEventListener("blur", async () => {
      const updatedNote = noteDiv.innerText.trim();
      const cardDocId = card.getAttribute("data-firestore-id");
      if (cardDocId) {
        const cardRef = doc(db, "kanbanCards", cardDocId);
        try {
          await updateDoc(cardRef, { remarks: updatedNote });
          console.log("✅ บันทึก Note เรียบร้อย:", updatedNote);
          const formData = new URLSearchParams();
          formData.append("productCode", card.querySelector("p").innerText.split(":")[1].trim());
          formData.append("remarks", updatedNote);

     fetch("https://script.google.com/macros/s/AKfycbzZOMpmu-lJHXCeyNuhAqXBamj9_EVdoQtt2fgYpdS0pAfbyGbh6nPivZqZGaj4xw7ohw/exec", {
         method: "POST",
         headers: {
         "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
  },
  body: formData.toString()
})
.then(res => res.json())
.then(response => {
  console.log("✅ อัปเดตหมายเหตุ Google Sheets แล้ว:", response);
})
.catch(err => {
  console.error("❌ อัปเดตหมายเหตุใน Sheets ล้มเหลว:", err);
});
        } catch (error) {
          console.error("❌ บันทึก Note ไม่สำเร็จ:", error);
        }
      }
    });
  }


  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
   return `${hours}:${minutes}:${seconds}`;
  }
}

// Toggle form show/hide
function toggleForm() {
  const form = document.getElementById("addCardForm");
  const btn = document.getElementById("addCardBtn");
  const isHidden = form.classList.contains("hidden");

  if (isHidden) {
    form.classList.remove("hidden");
    btn.textContent = "ซ่อนฟอร์ม";
  } else {
    form.classList.add("hidden");
    btn.textContent = "เพิ่มการ์ดใหม่";
  }
}

// Update card colors by due date
function updateCardColors() {
  const cards = document.querySelectorAll(".kanban-card");

  cards.forEach((card) => {
    const dueDateStr = card.getAttribute("data-due-date");
    if (!dueDateStr) return;

    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Remove old classes
    card.classList.remove("card-red", "card-yellow", "card-green");

    if (diffDays <= 2) {
      card.classList.add("card-red");
    } else if (diffDays <= 7) {
      card.classList.add("card-yellow");
    } else {
      card.classList.add("card-green");
    }
  });
}

// On page load setup
document.addEventListener("DOMContentLoaded", () => {
loadCardsFromFirestore().then(() => {
  updateCardColors();
  setInterval(updateCardColors, 60 * 60 * 1000); // ทุก 1 ชั่วโมง

});
  const cards = document.querySelectorAll(".kanban-card");
  const columns = document.querySelectorAll(".column");
  document.getElementById("addCardBtn").addEventListener("click", toggleForm);

  cards.forEach((card) => {
    makeDraggable(card);
    
  });

  columns.forEach((column) => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    column.addEventListener("drop", async  (e) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData("text/plain");
      const draggedCard = document.getElementById(cardId);
      if (draggedCard && column !== draggedCard.parentElement) {
        column.appendChild(draggedCard);
        const newStatus = column.getAttribute("data-status");
    try {
      const cardDocId = draggedCard.getAttribute("data-firestore-id"); // ต้องตั้งค่านี้ตอนโหลดการ์ด
      if (cardDocId) {
        const cardRef = doc(db, "kanbanCards", cardDocId);
        await updateDoc(cardRef, { status: newStatus });
        console.log("✅ อัปเดตสถานะใน Firestore เป็น", newStatus);
        const formData = new URLSearchParams();
    formData.append("productCode", draggedCard.querySelector("p").innerText.split(":")[1].trim());
    formData.append("status", newStatus);

    fetch("https://script.google.com/macros/s/AKfycbzZOMpmu-lJHXCeyNuhAqXBamj9_EVdoQtt2fgYpdS0pAfbyGbh6nPivZqZGaj4xw7ohw/exec", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: formData.toString()
    })
    .then(res => res.json())
    .then(response => {
      console.log("✅ อัปเดตสถานะ Google Sheets แล้ว:", response);
    })
    .catch(err => {
      console.error("❌ อัปเดตสถานะใน Sheets ล้มเหลว:", err);
    });
      }
    } catch (error) {
      console.error("❌ อัปเดตสถานะล้มเหลว:", error);
    }
      }
    });
  });

  // Form submission: Add new card
  document.getElementById("cardForm").addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form values
    const productCode = document.getElementById("productCode").value;
    const employeeName = document.getElementById("employeeName").value;
    const customerName = document.getElementById("customerName").value;
    const productName = document.getElementById("productName").value;
    const productNumber = document.getElementById("productNumber").value;
    const remarks = document.getElementById("remarks").value;
    const orderDate = document.getElementById("orderDate").value;
    const dueDate = document.getElementById("dueDate").value;

     const status = document.getElementById("status").value;

    // Prepare data object
    const cardData = {
      productCode,
      employeeName,
      customerName,
      productName,
      productNumber,
      orderDate,
      dueDate,
      status,
      remarks,
      elapsedTime: "00:00:00",

    };

    // Save to Firestore
saveCardToFirestore(cardData).then(() => {
  // เคลียร์การ์ดเดิมก่อนโหลดใหม่
  document.querySelectorAll(".kanban-card").forEach(card => card.remove());
  loadCardsFromFirestore();
});


    // Send to Google Sheets (optional)
 const formData = new URLSearchParams();
formData.append('productCode', cardData.productCode);
formData.append('employeeName', cardData.employeeName);
formData.append('customerName', cardData.customerName);
formData.append('productName', cardData.productName);
formData.append('productNumber', cardData.productNumber);
formData.append('orderDate', cardData.orderDate);
formData.append('dueDate', cardData.dueDate);
formData.append('remarks', cardData.remarks);
formData.append('elapsedTime', cardData.elapsedTime);
formData.append('status', cardData.status || "");

fetch("https://script.google.com/macros/s/AKfycbzZOMpmu-lJHXCeyNuhAqXBamj9_EVdoQtt2fgYpdS0pAfbyGbh6nPivZqZGaj4xw7ohw/exec", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
  },
  body: formData.toString()
})
.then(res => res.json())
.then(response => {
  console.log("✅ ส่งไป Google Sheets แล้ว:", response);
})
.catch(err => {
  console.error("❌ เกิดข้อผิดพลาดในการส่งไป Sheets:", err);
});

    // Calculate deadline color
    let deadlineClass = "";
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) {
      deadlineClass = "card-red";
    } else if (diffDays <= 5) {
      deadlineClass = "card-yellow";
    } else {
      deadlineClass = "card-green";
    }


   
    


    
    // Reset and hide form
    this.reset();
    toggleForm();
  });

  // Initial color update and interval
  updateCardColors();
  setInterval(updateCardColors, 1000);
});
