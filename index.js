const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var nodemailer = require('nodemailer');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ortxu.mongodb.net/?retryWrites=true&w=majority`





app.get('/', (req, res) => {
    res.send('Hello From cars costume own portal!');
})

app.listen(port, () => {
    console.log(`Cars costume App listening on port ${port}`)
});