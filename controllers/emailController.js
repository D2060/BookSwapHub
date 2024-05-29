import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();
import admin from '../config/firebaseConfig.js';
import moment from 'moment-timezone';
const db = admin.firestore();

// Create a transporter using your email service provider's SMTP settings
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use any email service
  auth: {
    user: process.env.MAIL,
    pass: process.env.PASS
  }
});

const generateRandomGreeting = () => {
  const greetings = [
    "Hello, Literary Hero!",
    "Hi there, Book Lover!",
    "Greetings, Avid Reader!",
    "Hey, Book Enthusiast!",
    "Salutations, Bibliophile!"
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
};

const generateRandomSignOff = () => {
  const signOffs = [
    "With gratitude and bookish joy,",
    "Happy reading adventures,",
    "With warm regards and literary love,",
    "Thank you and happy sharing,",
    "Yours in the joy of reading,"
  ];
  return signOffs[Math.floor(Math.random() * signOffs.length)];
};

// Function to create the contact link
const createContactLink = (baseUrl, bookId, requesterInfo) => {
  const link = `${baseUrl}/api/contact?bookId=${bookId}&name=${requesterInfo.name}&email=${requesterInfo.email}&phone=${requesterInfo.phone}&id=${requesterInfo.id}&class=${requesterInfo.class}`;
  return link;
};

// Function to create the WhatsApp link
const createWhatsAppLink = (phone, bookTitle,name) => {
  const message = `Hello ${name}, I'm reaching out about your request for my book "${bookTitle}". Let's connect to arrange the exchange. Thanks`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

// Function to create the mailto link
const createMailtoLink = (email, bookTitle, requesterName) => {
  const subject = `Your Book Request for "${bookTitle}"`;
  const body = `Hi ${requesterName},\n\nI'm reaching out about your request for my book "${bookTitle}".\n\nLet's arrange the exchange.\n\nThanks!`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// Function to send email
export const sendAskNowEmail = async (req, res) => {
  const { bookId, name, email, phone, id, class: userClass } = req.body;

  // Fetch baseUrl from the request
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const contactLink = createContactLink(baseUrl, bookId, { name, email, phone, id, class: userClass });
  const whatsappRedirectLink = `${baseUrl}/api/confirmWhatsAppContact?bookId=${bookId}&name=${name}&email=${email}&phone=${phone}&id=${id}&class=${userClass}`;
  const emailRedirectLink = `${baseUrl}/api/confirmEmailContact?bookId=${bookId}&name=${name}&email=${email}&phone=${phone}&id=${id}&class=${userClass}`;

  try {
    const bookDoc = await db.collection('books').doc(bookId).get();
    if (!bookDoc.exists) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const book = bookDoc.data();
    const ownerEmail = book.owner.email;

    // Email construction without test values
    const mailOptions = {
      from: process.env.MAIL,
      to: ownerEmail, // Send email to the book owner
      subject: `📖✨ You have Got a Book Request for "${book.title}" ✨📖`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; text-align: center;">
          <h2 style="color: #5D4037;">${generateRandomGreeting()}</h2>
          <p style="font-size: 1.1em;">Fantastic news! Your beloved book <strong>"${book.title}"</strong> has caught the eye of a passionate reader.</p>
          <p style="font-size: 1.1em;">Click one of the buttons below to connect with them and share the magic of <strong>"${book.title}"</strong>.</p>
          <p style="font-size: 1.1em;">Remember, every book has its own adventure, and now yours is about to embark on a new one!</p>
          <div style="margin: 20px 0;">
            <a href="${whatsappRedirectLink}"
              style="background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 1.2em; display: inline-block; margin-right: 10px;">
              📲 Connect with WhatsApp
            </a>
            <a href="${emailRedirectLink}"
              style="background-color: #6200ee; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 1.2em; display: inline-block;">
              📧 Connect via Email
            </a>
          </div>
          <p style="font-size: 1.1em;">${generateRandomSignOff()}<br/>BookSwapHub Team<br/>📚🌟✨</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    const currentTime = moment().tz('Asia/Kolkata').toString();
    await db.collection('emailSent').doc(`${book.title}_${new Date().toISOString()}`).set({
      owner: book.owner.name,
      recipient: name,
      Date_and_Time: currentTime
    });

    res.status(200).json({ message: 'Request submitted successfully!' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to send email', error });
  }
};


// Endpoint to handle WhatsApp contact confirmation
export const confirmWhatsAppContact = async (req, res) => {
  const { bookId, name, email, phone, id, class: userClass } = req.query;

  try {
    // Fetch the book document from Firestore
    const bookDoc = await db.collection('books').doc(bookId).get();
    if (!bookDoc.exists) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const book = bookDoc.data();

    const currentTime = moment().tz('Asia/Kolkata').toString();

    await db.collection('emailReplied').doc(`${book.title}_${new Date().toISOString()}`).set({
      owner: book.owner.name,
      recipient: name,
      Date_and_Time: currentTime
    });

    // Create a new history entry
    const historyEntry = {
      timestamp: currentTime,
      requester: { name, email, phone, id, class: userClass },
      method:"Whatsapp"
    };

    // Update the book document, adding the new history entry to the history array
    await db.collection('books').doc(bookId).update({
      history: admin.firestore.FieldValue.arrayUnion(historyEntry)
    });
    

    // Create WhatsApp link
    const whatsappLink = createWhatsAppLink(phone,book.title,name);

    // Redirect to the WhatsApp link
    res.redirect(whatsappLink);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to record WhatsApp contact', error });
  }
};

// Endpoint to handle Email contact confirmation
export const confirmEmailContact = async (req, res) => {
  const { bookId, name, email, phone, id, class: userClass } = req.query;

  try {
    // Fetch the book document from Firestore
    const bookDoc = await db.collection('books').doc(bookId).get();
    if (!bookDoc.exists) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const book = bookDoc.data();

    const currentTime = moment().tz('Asia/Kolkata').toString();
    
    await db.collection('emailReplied').doc(`${book.title}_${new Date().toISOString()}`).set({
      owner: book.owner.name,
      recipient: name,
      Date_and_Time: currentTime
    });

    // Create a new history entry
    const historyEntry = {
      timestamp: currentTime,
      requester: { name, email, phone, id, class: userClass },
      method:"Email"
    };

    // Update the book document, adding the new history entry to the history array
    await db.collection('books').doc(bookId).update({
      history: admin.firestore.FieldValue.arrayUnion(historyEntry)
    });

    // Create Mailto link
    const mailtoLink = createMailtoLink(email, book.title, name);

    // Redirect to the mailto link
    res.redirect(mailtoLink);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to record Email contact', error });
  }
};
