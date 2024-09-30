const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// Initialize the Express app
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
}));

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'a',
  host: 'localhost',
  database: 'my_portfolio_dev',
  password: '12345',
  port: 5432,  // Default PostgreSQL port
});

pool.connect((err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

// Create tables if they don't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    company VARCHAR(255),
    position VARCHAR(255),
    hiring BOOLEAN,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT,
    consent BOOLEAN
  );
`, (err, res) => {
  if (err) {
    console.error('Error creating contacts table:', err);
  } else {
    console.log('Contacts table created or already exists.');
  }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS nda_signers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL
  );
`, (err, res) => {
  if (err) {
    console.error('Error creating nda_signers table:', err);
  } else {
    console.log('NDA signers table created or already exists.');
  }
});

// Contact form route
app.post('/contact', (req, res) => {
  const { name, company, position, hiring, email, phone, message, consent } = req.body;

  pool.query(
    `INSERT INTO contacts (name, company, position, hiring, email, phone, message, consent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [name, company, position, hiring, email, phone, message, consent],
    (err, result) => {
      if (err) {
        console.error('Error saving contact information:', err);
        res.status(500).json({ error: 'Error saving contact information' });
      } else {
        sendEmail(name, company, position, hiring, email, phone, message, consent);  // Send email function
        res.status(200).json({ message: 'Contact information saved and email sent' });
      }
    }
  );
});

// NDA route
app.post('/nda', (req, res) => {
  const { name, email } = req.body;

  pool.query(
    `INSERT INTO nda_signers (name, email) VALUES ($1, $2)`,
    [name, email],
    (err, result) => {
      if (err) {
        console.error('Error saving NDA information:', err);
        res.status(500).json({ error: 'Error saving NDA information' });
      } else {
        res.status(200).json({ message: 'NDA signed successfully' });
      }
    }
  );
});

// Nodemailer function to send emails
function sendEmail(name, company, position, hiring, email, phone, message, consent) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',  // You can use a different service like Outlook, SendGrid, etc.
    auth: {
      user: process.env.EMAIL_USER,  // Your email (set in .env)
      pass: process.env.EMAIL_PASS   // Your email password
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,  // The email where you want notifications sent
    subject: 'New Contact Form Submission',
    text: `
      Name: ${name}
      Company: ${company}
      Position: ${position}
      Hiring: ${hiring ? 'Yes' : 'No'}
      Email: ${email}
      Phone: ${phone}
      Message: ${message}
      Consent: ${consent ? 'Yes' : 'No'}
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      return console.error('Error sending email:', err);
    }
    console.log('Email sent:', info.response);
  });
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


