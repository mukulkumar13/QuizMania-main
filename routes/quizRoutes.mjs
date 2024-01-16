import express from 'express';
import checkUserLogin from '../middleware/userMiddleware.mjs';
import Quiz from '../models/quizModel.mjs';
import UserScore from '../models/userScoreModel.mjs';
import router from './authRoutes.mjs';
import path, { join } from 'path';
import moment from "moment-timezone";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import useragent from 'express-useragent';
import requestIp from 'request-ip';

const __dirname = path.dirname(new URL(import.meta.url).pathname);


router.post('/addquiz', checkUserLogin, async (req, res) => {

  try {
  const { quizTopic, questions,isRandom,singleTime,imageUrl } = req.body;

  if (!quizTopic || !Array.isArray(questions) || questions.length === 0 || quizTopic.length<3) {
    return res.status(400).json({ message: 'Invalid quiz data format' });
  }

  if (isRandom === "yes" || isRandom === "no");
  else {
    return res.status(400).json({ message: 'Invalid quiz type' });
  }

  if (singleTime === "yes" || singleTime === "no");
  else {
    return res.status(400).json({ message: 'Invalid quiz play value' });
  }
  for (const question of questions) {
    if (
      !question.question ||
      !Array.isArray(question.options) ||
      !question.answer
    ) {
      return res.status(400).json({ message: 'Invalid question format' });
    }
    if(question.imageUrl){
      if(question.imageUrl.length<10){
        return res.status(400).json({ message: 'Invalid Image URL' });
      }
    }

    if(question.timerValue<10)
    {
      return res.status(400).json({ message: 'Invalid Timing , timining must be atleast of 10 sec' });
    }
  }

  // Generate a random quizId
  const quizId = generateSevenDigitNumericId();

  
    const jwtCookie = req.cookies.jwt;

    if (jwtCookie) {
      try {
        const decodedToken = jwt.verify(jwtCookie, process.env.JWT_SECRET);
        const email = decodedToken.email;
        const creationTime = moment().tz("Asia/Kolkata").format();
      
        const quiz = new Quiz({
          quizId,
          isRandom,
          quizTopic,
          questions,
          singleTime,
          createdBy: email,
          creationTime, 
        });

        // Save the quiz to the database
        await quiz.save();

        res.status(201).json({ message: 'Quiz added successfully', quizId });
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError);
        res.status(401).json({ message: 'Unauthorized' });
      }
    } else {
      // Handle the case where the JWT cookie is not present or invalid
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    console.error('Error adding quiz:', error);
    res.status(500).json({ message: 'Error adding quiz' });
  }
});

// API endpoint to get quiz questions
router.get('/getQuestion/:quizId', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;

  // Check if req.session.quiz is defined
  if (!req.session.quiz) {
    return res.status(200).json({ error: 'Invalid Quiz Session' });
  }

  // Verify that the requested quizId matches the joinCode stored in the session
  if (quizId != req.session.quiz.joinCode) {
    return res.status(401).json({ error: 'Invalid Quiz Session2' });
  }

  try {
   
    if(req.session.quiz.isNew==true){
      req.session.quiz.isNew = false;
      req.session.quiz.time = Date.now();
    }
    const questions = req.session.quiz.questions;

    // Calculate the timeLeft based on the time elapsed since the user started the quiz
    let timeLeft = 0;

    if (req.session.quiz.currentQuestionIndex === questions.length) {
      return res.status(200).json({ status: 'true', message: 'quiz completed',currentQuestion:req.session.quiz.currentQuestionIndex+1,totalQuestions:questions.length, score:req.session.quiz.userScore });
    }

    var qtime =  req.session.quiz.questions[req.session.quiz.currentQuestionIndex].timerValue || 10;
    if (Date.now() - req.session.quiz.time < qtime*1000) {
      const elapsedTimeInMilliseconds = Date.now() - req.session.quiz.time;
      timeLeft = qtime - Math.floor(elapsedTimeInMilliseconds / 1000); // Convert to seconds and round down
    }

    
    const CurQuestion = questions[req.session.quiz.currentQuestionIndex]; 

    res.json({ question: CurQuestion.question, options: CurQuestion.options,imageUrl:CurQuestion.imageUrl,test:2, timeleft: timeLeft, currentQuestion:req.session.quiz.currentQuestionIndex+1,totalQuestions:questions.length, score:req.session.quiz.userScore});
  } catch (err) {
    return res.status(500).json({ error: 'Error while querying the database' });
  }
});



// API endpoint to submit user answers
router.post('/submitQuestion/:quizId', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;
  const userAnswer = req.body.answer; // User's answer received in the request body

  // Check if the session, quiz, or join code is invalid
  if (!req.session || !req.session.quiz || req.session.quiz.joinCode != quizId) {
    // Return an Unauthorized response for an invalid quiz session
    return res.status(401).json({ error: 'Invalid quiz session' });
  }

  const userSession = req.session.quiz;

  try {
  

    const questions = req.session.quiz.questions;
    if(questions.length==req.session.quiz.currentQuestionIndex){
        return res.json({score:req.session.quiz.userScore,message: 'Quiz finished'})
    }
    const currentQuestion = questions[userSession.currentQuestionIndex];

    // Check if the user's answer matches the correct answer
    const isAnswerCorrect = currentQuestion.answer.toUpperCase() === userAnswer.toUpperCase();

    if (isAnswerCorrect) {
      // Increment the user's score if the answer is correct
      userSession.userScore++;
    }

    req.session.quiz.isNew = true;
    // Update current question index
    userSession.currentQuestionIndex++;

    if (userSession.currentQuestionIndex < questions.length) {
    
      updateScoreAndStatus(userSession.playId, userSession.userScore, 'incomplete',userSession.currentQuestionIndex);
      res.json({
        currentQuestion:req.session.quiz.currentQuestionIndex,
        totalQuestions:questions.length,
        score:userSession.userScore,
        correctAnswer: currentQuestion.answer.toLowerCase(),
        lastAnswerCorrect: isAnswerCorrect,
      });
    } else {

    const userIp = requestIp.getClientIp(req);
    const userAgent = req.useragent.source;
    updateScoreAndStatus(userSession.playId, userSession.userScore, 'completed',userSession.currentQuestionIndex);
      // Quiz finished, save the user's score
      const score = userSession.userScore;

      res.json({
        currentQuestion:req.session.quiz.currentQuestionIndex,
        totalQuestions:questions.length,
        score,
        message: 'Quiz finished',
        correctAnswer: currentQuestion.answer.toLowerCase(),
        lastAnswerCorrect: isAnswerCorrect, 
      });
    }
  } catch (error) {
  
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.get('/myquizes', async (req, res) => {
  const jwtCookie = req.cookies.jwt;

  if (jwtCookie) {
    try {
      const decodedToken = jwt.verify(jwtCookie, process.env.JWT_SECRET);
      const userId = decodedToken.email;

      try {
       
        const userQuizzes = await Quiz.find({ createdBy: userId ,status:"active"}, 'quizId createdBy creationTime quizTopic questions');
       
        // Map quizzes to include the creationTime in a more readable format
        const quizzesWithFormattedTime = userQuizzes.map((quiz) => ({
          quizId: quiz.quizId,
          createdBy: quiz.createdBy,
          quizTopic: quiz.quizTopic,
          creationTime: moment(quiz.creationTime).tz("Asia/Kolkata").format("MMMM Do YYYY, h:mm:ss a"), // Adjust the format as needed
          numberOfQuestions:quiz.questions.length,
        }));

        res.render('myquizes', { quizzes: quizzesWithFormattedTime,title:'Myquizes' ,currentPage:'myquizes'});

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while fetching user quizzes.' });
      }
    } catch (jwtError) {
      res.send('<script> window.location.href = "/login";</script>');
      console.error('JWT verification error:', jwtError);
    }
  } else {
    res.status(401).send('<script>  window.location ="/login"; </script>');
  }
});

router.post('/terminate/:quizId', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;
  const userAnswer = req.body.answer; // User's answer received in the request body

  // Check if the session, quiz, or join code is invalid
  if (!req.session || !req.session.quiz || req.session.quiz.joinCode != quizId) {
    // Return an Unauthorized response for an invalid quiz session
    return res.status(401).json({ error: 'Invalid quiz session' });
  }

  const userSession = req.session.quiz;

  try {
  

    const questions = req.session.quiz.questions;
    if(questions.length==req.session.quiz.currentQuestionIndex){
        return res.json({score:req.session.quiz.userScore,message: 'Quiz finished'})
    }
    const currentQuestion = questions[userSession.currentQuestionIndex];

    // Check if the user's answer matches the correct answer
    const isAnswerCorrect = currentQuestion.answer.toUpperCase() === userAnswer.toUpperCase();

    if (isAnswerCorrect) {
      // Increment the user's score if the answer is correct
      userSession.userScore++;
    }

    // Update current question index
    req.session.quiz.isNew = true;
    userSession.currentQuestionIndex++;

    const score = userSession.userScore;
    updateScoreAndStatus(userSession.playId, score, "terminated",userSession.currentQuestionIndex);
    req.session.destroy();
      res.json({
        currentQuestion:userSession.currentQuestionIndex,
        totalQuestions:questions.length,
        score,
        message: 'Quiz finished',
        correctAnswer: currentQuestion.answer.toLowerCase(),
        lastAnswerCorrect: isAnswerCorrect, 
      });


  } catch (error) {
    console.log(error)
  
    res.status(500).json({ error: 'An error occurred' });
  }
});



router.post('/checkuserplay',checkUserLogin,async (req,res)=>{
  const quizId = req.body.quizid;
  const userToken = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET); 
  const userId = userToken.email; // the email is stored in the JWT payload
 
  try {
    // Use findOne to check if a record with the specified quizId and userId exists
    const existingRecord = await UserScore.findOne({ quizId, userId, status: 'incomplete' })
    if(!!existingRecord){
      return res.status(200).json({status:true,message:"User have an incomplete Attempt for this quiz",playId:existingRecord.playId});
    }else{
      return res.status(200).json({status:false,message:"User doesn't have an incomplete Attempt for this quiz"});
    }
  } catch (error) {
    console.error('Error checking record:', error);
    return res.status(400).json({valid:false,message:"We cant process your request right now, Please try again later"});
  }
});


router.get('/playbyid/:playId',checkUserLogin,async(req,res)=>{
  try {
    const playId = req.params.playId;

    // Find the user score details based on the playId
    const userScore = await UserScore.findOne({ playId });

    if (!userScore) {
      return res.status(404).json({ message: 'playId not found' });
    }

    if (!req.session) {
      req.session = {};
    }

    const quiz = await Quiz.findOne({ quizId: userScore.quizId }).exec();
    if (!quiz) {
      // No quiz found for the given join code, so it's invalid
      return res.json({ valid: false, message: 'Invalid join code' });
    }

    var questions = quiz.questions;

    if(quiz.isRandom=="yes"){
      var shuffleSalt = userScore.shuffleSalt;
      shuffleArray(questions,shuffleSalt);
    }

    req.session.quiz = {
      currentQuestionIndex: userScore.AttemptedCount,
      questions,
      userScore: userScore.score,
      joinCode: userScore.quizId,
      userId: userScore.userId, 
      time: Date.now(),
      isNew: true,
      playId,
    };

    // Send the user score details in the response
    res.status(200).json({status:true,quizId:userScore.quizId});
  } catch (error) {
    console.error('Error retrieving user score:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.post('/validateJoinCode', checkUserLogin, async (req, res) => {
  const joinCode = req.body.joinCode;

  try {
   const quiz = await Quiz.findOne({ quizId: joinCode }).exec();
    if (!quiz) {
      // No quiz found for the given join code, so it's invalid
      return res.json({ valid: false, message: 'Invalid join code' });
    }

    // Extract the user's email from the JWT token
    const userToken = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET); 
    const userEmail = userToken.email; // the email is stored in the JWT payload
    const username = userToken.username;
    
    // Initialize req.session if it's not already
    if (!req.session) {
      req.session = {};
    }


    var questions = quiz.questions;
    if(quiz.isRandom=="yes"){
      var shuffleSalt = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
      shuffleArray(questions,shuffleSalt);
    }

    if(quiz.singleTime=="yes"){
      
      try {
        // Use findOne to check if a record with the specified quizId and userId exists
        const existingRecord = await UserScore.findOne({ quizId:joinCode,userId:userEmail});
       
        if(!!existingRecord){
          return res.status(200).json({valid:false,message:"This Quiz can be played single time per user only!!"});
        }
      } catch (error) {
        console.error('Error checking record:', error);
        return res.status(400).json({valid:false,message:"We cant process your request right now, Please try again later"});
      }
    }
    const playId = generateSevenDigitNumericId();
    req.session.quiz = {
      currentQuestionIndex: 0,
      questions,
      userScore: 0,
      joinCode,
      userId: userEmail, 
      time: Date.now(),
      isNew: true,
      playId,
    };
   

    const userIp = requestIp.getClientIp(req);
    const userAgent = req.useragent.source;

    addDefaultData(joinCode, userEmail,username, playId,userIp,userAgent,questions.length,shuffleSalt);
    res.json({ valid: true, quizId: quiz.quizId });
  } catch (err) {
    
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Route to view the leaderboard for a quiz
router.get('/:quizId/leaderboard', checkUserLogin, async (req, res) => {
  const quizId = req.params.quizId;
  try {
    // Extract the user's email from the JWT token
    const userToken = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET); 
    const userEmail = userToken.email; 
    const leaderboardData = await UserScore.aggregate([
      {
        $match: { quizId: quizId }
      },
      {
        $sort: { userId: 1, score: -1, username: 1 } 
      },
      {
        $group: {
          _id: "$userId",
          highestScore: { $first: "$score" },
          username: { $first: "$username" },
          quizId: { $first: "$quizId" }
        }
      },
      {
        $project: {
          _id: 0,
          quizId: 1,
          userId: "$_id",
          username: 1, 
          score: "$highestScore"
        }
      },
      {
        $sort: { score: -1 } 
      },
      {
        $limit: 10
      }
    ]);
    // Find the user's rank based on their email
    const userRank = leaderboardData.findIndex(entry => entry.userId === userEmail);
    
    res.render('leaderboard', {leaderboardData, userRank,title:'Leaderboard',currentPage:'leaderboard'});

  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred');
  }
});


router.get('/getaiquiz', async (req, res) => {
  try {
    let topic = req.query.topic;
    if (topic.length < 3) {
      res.status(400).json({ error: 'Topic length must be at least 3 characters' });
      return; 
    }

    const apiUrl = process.env.OPENAIAPI;
    const response = await fetch(`${apiUrl}?str=${topic}`);

    if (response.ok) {
      
      const jsonData = await response.json();
      if(jsonData.error){
        return res.status(200).json({error:jsonData.error});
      }
      res.status(200).json(JSON.stringify(jsonData));
    } else {
      console.error('Error making the API request:', response.status, response.statusText);
      res.status(response.status).json({ error: `API request failed with status ${response.status}` });
    }
  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const shuffleArray = (array, shuffleSalt) => {
  const seededRandom = (max) => {
    let seed = parseInt(shuffleSalt, 36) || 0;
    const x = Math.sin(seed++) * 10000;
    return Math.floor((x - Math.floor(x)) * (max + 1));
  };

  for (let i = array.length - 1; i > 0; i--) {
    const j = seededRandom(i);
    [array[i], array[j]] = [array[j], array[i]];
  }
};

// Helper function to generate a random quiz ID
function generateSevenDigitNumericId() {
  const min = 1000000; 
  const max = 9999999; 
  const numericId = Math.floor(Math.random() * (max - min + 1)) + min;
  return numericId.toString(); // Convert the number to a string
}


async function addDefaultData(quizId, userId,username, playId,userIp,userAgent,TotalCount,shuffleSalt) {
  try {
    // Check if there is already a record for the given playId
    const existingRecord = await UserScore.findOne({ playId });

    if (!existingRecord) {
      // If no record exists, create a new one with default data
      const defaultData = {
        quizId,
        userId,
        score: 0,
        AttemptedCount: 0,
        TotalCount,
        userIp,
        userAgent,
        username,
        playId,
        status: 'incomplete',
        shuffleSalt, 
        timestamp: moment().tz('Asia/Kolkata').format(),
      };

      const newUserScore = new UserScore(defaultData);
      await newUserScore.save();
    }
  } catch (error) {
    console.error('Error adding default data:', error);
  }
}

// Function to update userScore and status by playId
async function updateScoreAndStatus(playId, newScore, newStatus,qCount) {
  try {
    // Find the record based on playId
    const userScore = await UserScore.findOne({ playId });

    if (userScore) {
      // Update score and status
      userScore.score = newScore;
      userScore.status = newStatus;
      userScore.AttemptedCount = qCount;


      // Save the updated record
      await userScore.save();
    } else {
      console.error('UserScore not found for playId:', playId);
    }
  } catch (error) {
    console.error('Error updating score and status:', error);
  }
}

router.post('/deleteQuiz',checkUserLogin, async (req, res) => {
  const { quizId } = req.body;

  const jwtCookie = req.cookies.jwt;

      const decodedToken = jwt.verify(jwtCookie, process.env.JWT_SECRET);
      const email = decodedToken.email;

  try {
    if(quizId==''){
      return res.status(404).json({ error: "Quiz not found" });
    }
    // Check if the quiz with the given quizId and createdBy email exists
    const quiz = await Quiz.findOne({ quizId, createdBy: email });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Update the status to "inactive"
    quiz.status = "inactive";
    await quiz.save();

    return res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;