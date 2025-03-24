// Check if user is logged in
let currentUserId = localStorage.getItem('userId');
if (!currentUserId) {
    window.location.href = 'login_signup.html'; // Updated to match your filename
}

const tablePart = document.querySelector(".table-part");
const transactionTable = document.getElementById("transaction-table");
let transactions = [];
let editedTransaction = null;

// Scroll check function
function checkTableScroll() {
    const rowCount = transactionTable.rows.length - 1;
    const maxRowCount = 10;
    tablePart.classList.toggle("scrollable", rowCount > maxRowCount);
}

const observer = new MutationObserver(checkTableScroll);
observer.observe(transactionTable, { childList: true, subtree: true });

// Fetch expenses from backend
async function fetchExpenses() {
    try {
        const response = await fetch(`http://localhost:3000/api/expenses/${currentUserId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch expenses');
        }
        transactions = await response.json();
        console.log('Fetched transactions:', transactions); // Debug
        transactions = transactions.map(t => ({
            id: t.id, // Store the backend ID for edit/delete
            primeId: new Date(t.date).getTime(),
            description: t.description,
            amount: t.amount,
            type: t.type === 'income' ? 'income' : 'expense'
        }));
        updateTransactionTable();
        updateBalance();
    } catch (error) {
        console.error('Error fetching expenses:', error);
        alert('Error fetching expenses: ' + error.message);
    }
}

// Add transaction
async function addTransaction() {
    const description = document.getElementById("description").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;

    if (!description.trim() || isNaN(amount) || !date) {
        alert('Please fill in all fields: Description, Amount, and Date');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, description, amount, date, type })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add transaction');
        }
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("date").value = "";
        document.getElementById("type").value = "income"; // Reset to default
        fetchExpenses();
    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Error adding transaction: ' + error.message);
    }
}

// Delete transaction
async function deleteTransaction(primeId) {
    const transaction = transactions.find(t => t.primeId === primeId);
    if (!transaction) return;

    try {
        const response = await fetch(`http://localhost:3000/api/expenses/${transaction.id}`, {
            method: "DELETE"
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete transaction');
        }
        fetchExpenses();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction: ' + error.message);
    }
}

// Edit transaction
function editTransaction(primeId) {
    const transaction = transactions.find(t => t.primeId === primeId);
    if (!transaction) return;

    document.getElementById("description").value = transaction.description;
    document.getElementById("amount").value = transaction.amount;
    document.getElementById("type").value = transaction.type;
    document.getElementById("date").value = new Date(transaction.primeId).toISOString().split('T')[0];

    editedTransaction = transaction;
    document.getElementById("add-transaction-btn").style.display = "none";
    document.getElementById("save-transaction-btn").style.display = "inline-block";
}

// Save edited transaction
async function saveTransaction() {
    if (!editedTransaction) return;

    const description = document.getElementById("description").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;

    if (!description.trim() || isNaN(amount) || !date) {
        alert('Please fill in all fields: Description, Amount, and Date');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/expenses/${editedTransaction.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, description, amount, date, type })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save transaction');
        }
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("date").value = "";
        document.getElementById("type").value = "income";
        editedTransaction = null;
        document.getElementById("add-transaction-btn").style.display = "inline-block";
        document.getElementById("save-transaction-btn").style.display = "none";
        fetchExpenses();
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Error saving transaction: ' + error.message);
    }
}

// Update balance
function updateBalance() {
    let balance = 0.0;
    transactions.forEach(t => {
        balance += t.type === "income" ? t.amount : -t.amount;
    });
    console.log('Calculated balance:', balance); // Debug
    const currencyCode = document.getElementById("currency").value;
    const formattedBalance = formatCurrency(balance, currencyCode);
    const balanceElement = document.getElementById("balance");
    balanceElement.textContent = formattedBalance;
    balanceElement.classList.toggle("positive-balance", balance >= 0);
    balanceElement.classList.toggle("negative-balance", balance < 0);
}

// Format currency
function formatCurrency(amount, currencyCode) {
    const currencySymbols = { USD: "$", EUR: "€", INR: "₹" };
    const decimalSeparators = { USD: ".", EUR: ",", INR: "." };
    const symbol = currencySymbols[currencyCode] || "";
    const decimalSeparator = decimalSeparators[currencyCode] || ".";
    return symbol + amount.toFixed(2).replace(".", decimalSeparator);
}

// Format date
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Update transaction table
function updateTransactionTable() {
    while (transactionTable.rows.length > 1) {
        transactionTable.deleteRow(1);
    }
    console.log('Updating table with transactions:', transactions); // Debug
    const currencyCode = document.getElementById("currency").value;
    transactions.forEach(t => {
        const row = transactionTable.insertRow();
        row.insertCell().textContent = formatDate(new Date(t.primeId));
        row.insertCell().textContent = t.description;
        row.insertCell().textContent = formatCurrency(t.amount, currencyCode);
        row.insertCell().textContent = t.type;

        const actionCell = row.insertCell();
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.classList.add("edit-button");
        editBtn.addEventListener("click", () => editTransaction(t.primeId));
        actionCell.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("delete-button");
        deleteBtn.addEventListener("click", () => deleteTransaction(t.primeId));
        actionCell.appendChild(deleteBtn);
    });
    checkTableScroll();
}

// Event listeners
document.getElementById("add-transaction-btn").addEventListener("click", () => {
    console.log('Add Transaction button clicked'); // Debug
    addTransaction();
});
document.getElementById("save-transaction-btn").addEventListener("click", saveTransaction);
document.getElementById("currency").addEventListener("change", () => {
    updateBalance();
    updateTransactionTable();
});

// Initial load
window.addEventListener("DOMContentLoaded", fetchExpenses);

// Export functions
function handleDownload() {
    const exportFormat = prompt("Select export format: PDF or CSV").toLowerCase();
    if (exportFormat === "pdf") exportToPDF();
    else if (exportFormat === "csv") exportToCSV();
    else alert('Invalid export format. Please enter either "PDF" or "CSV".');
}

function exportToPDF() {
    const docDefinition = {
        content: [{
            table: {
                headerRows: 1,
                widths: ["auto", "*", "auto", "auto"],
                body: [
                    ["Date", "Description", "Amount", "Type"],
                    ...transactions.map(t => [
                        formatDate(new Date(t.primeId)),
                        t.description,
                        t.amount.toString(),
                        t.type
                    ])
                ]
            }
        }],
        styles: { header: { fontSize: 12, bold: true, margin: [0, 5] } }
    };
    pdfMake.createPdf(docDefinition).download("transactions.pdf");
}

function exportToCSV() {
    const csvContent = "Date,Description,Amount,Type\n" +
        transactions.map(t => `${formatDate(new Date(t.primeId))},${t.description},${t.amount},${t.type}`).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "transactions.csv";
    link.click();
}