const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

// Create a new jsPDF instance
const doc = new jsPDF();

// Set document margins and page size
const margin = 15;
const pageWidth = doc.internal.pageSize.width;
const pageHeight = doc.internal.pageSize.height;
const textWidth = pageWidth - 2 * margin; // Allow for margins on both sides

// Helper function to handle text wrapping
function addText(doc, text, x, y, maxWidth) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return lines.length * doc.getLineHeight() / doc.internal.scaleFactor;
}

// Set font and style for the document
doc.setFont('Helvetica', 'normal');
doc.setFontSize(14);

// Add a title
doc.setFontSize(18);
doc.text('Answers to Apple Review Questions', pageWidth / 2, 20, { align: 'center' });

// Add some space after the title
doc.setFontSize(14);
let yPosition = 30;

// Function to add questions and answers with minimal space
function addQA(doc, question, answer, yPosition) {
  // Add Question
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  const questionHeight = addText(doc, question, margin, yPosition, textWidth);

  yPosition += questionHeight + 5; // Space between question and answer

  // Add Answer
  doc.setFontSize(12);
  doc.setFont('Helvetica', 'normal');
  const answerHeight = addText(doc, answer, margin, yPosition, textWidth);

  return yPosition + answerHeight + 10; // Space after each Q&A
}

// Function to add a new page if content exceeds page height
function checkPageBreak(doc, yPosition) {
  if (yPosition > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return yPosition;
}

// Add each question and answer with minimal spacing
const questionsAndAnswers = [
  {
    question: 'Question 1: Is your app restricted to users who are part of a single company?',
    answer: 'No, Opex Logistics is designed for multiple Delivery Service Partners (DSPs) working with Amazon. The app allows different DSPs to manage their operations independently. Each DSP can register its employees. Access is granted based on a DSP code, email, and password, ensuring that only authorized users within the DSP can access the app. Each DSP is treated as an independent entity, and the app can handle multiple DSPs at the same time. Therefore, it is not restricted to users from a single company, and any DSP can use the platform.'
  },
  {
    question: 'Question 2: Is your app designed for use by a limited or specific group of companies?',
    answer: 'While Opex Logistics is primarily designed for Delivery Service Partners (DSPs) working with Amazon, any company can use the app if they find that it meets their needs. The app incorporates management concepts specifically tailored to DSP operations, but it is not restricted to DSPs alone. Other companies may also benefit from using the app if it aligns with their operational requirements.'
  },
  {
    question: 'Question 3: What features in the app, if any, are intended for use by the general public?',
    answer: 'Opex Logistics is primarily designed for DSPs and their employees, so there are no features specifically intended for the general public. The app focuses on managing logistics and delivery operations for Amazon DSPs, and access is restricted to authorized users within those companies.'
  },
  {
    question: 'Question 4: How do users obtain an account?',
    answer: 'DSP managers can request an account through our website. After the request is approved, we provide an account for the manager, who can change the credentials as needed. The manager then sends invitations to employees via email. We use deep linking to open the account creation page directly in the app for employees, making the process seamless.'
  },
  {
    question: 'Question 5: Is there any paid content in the app and if so who pays for it? For example, do users pay for opening an account or using certain features in the app?',
    answer: 'Yes, the owners of DSPs will have free access to the app for a limited period. If they find the app useful, they will need to pay to continue using it. There are no paid features within the app itself. The monthly subscription fee is managed through our website, and users pay to continue accessing the app after the trial period.'
  }
];

questionsAndAnswers.forEach((qa, index) => {
  yPosition = addQA(doc, qa.question, qa.answer, yPosition);
  yPosition = checkPageBreak(doc, yPosition);
});

// Add footer with page number
doc.setFontSize(10);
doc.setFont('Helvetica', 'normal');
doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 20, pageHeight - 10);

// Save the document as a PDF file
const outputPath = path.join(__dirname, 'Opex_Logistics_Answers.pdf');
doc.save(outputPath);

console.log('PDF has been created successfully at:', outputPath);