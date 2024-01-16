import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import jwt from "jsonwebtoken";
import authRoutes from './routes/authRoutes.mjs';
import quizRoutes from './routes/quizRoutes.mjs'; 
import session from 'express-session';
import checkUserLogin from './middleware/userMiddleware.mjs';
import { readFileSync } from "fs";

import fileUploadRoutes from './routes/fileUploadRoutes.mjs';
const quizzesData = JSON.parse(readFileSync("./quizzes.json"));
const app = express();

app.use('/uploads', express.static('public'));
dotenv.config();

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true,
}));

const port = process.env.PORT;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.json()); // For JSON parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.resolve() + '/public'));

import './models/userModel.mjs';



app.use(express.static('public'));
app.get('/', (req, res) => {
  const currentPage = 'dashboard';
  res.render('dashboard', { title: 'Dashboard', currentPage: 'dashboard', quizzes: quizzesData });
});


app.get('/dashboard',(req,res)=>{
  const currentPage='dashboard';
  res.render('dashboard',{title:'Dashboard',currentPage:'dashboard',quizzes: quizzesData });

})
app.get('/addquiz',(req,res)=>{
  const currentPage='addquiz';
  res.render('addquiz',{title:'Create Quiz',currentPage:'addquiz'});
  
})
app.get('/login',(req,res)=>{
  res.render('login',{title:'login'});
})
app.get('/signup',(req,res)=>{
  res.render('signup',{title:'signup'});
})

app.get("/join",(req,res)=>{
  res.render("join",{title:'Join Quiz',currentPage:'join'});
});

// Route to join a quiz
app.get('/joinquiz/:quizId', checkUserLogin, (req, res) => {
  const quizId = req.params.quizId;
  res.render('joinquiz', { quizId,title:'Joinquiz'});
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });



  app.get('/createAiquiz', (req, res) => {
    res.render("createAIquiz",{title:'Generate Quizes using AI',currentPage:'createAiquiz'});
  });


  app.get('/aiquiz', (req, res) => {
    res.render("aiquiz",{title:'Generate Quizes using AI',currentPage:'aiquiz'});
  });

  app.get('/forgotemailverify', (req, res) => {
    res.render("forgotemailverify",{title:'Forgot Password'});
  });


  

  app.use('', authRoutes);
app.use('', quizRoutes);


  app.all("*",(req,res)=>{
    res.status(404).json({status:'Not Found'});
  })
