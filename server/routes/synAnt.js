const express = require('express');
const router = express.Router();
const synAnt = require('../synAnt');

/**
 * GET /synant-api/question
 * Returns a puzzle for the given level and round index
 */
router.get('/question', (req, res) => {
  const level = parseInt(req.query.level, 10) || 1;
  const index = parseInt(req.query.index, 10) || 1;
  
  const puzzle = synAnt.getPuzzleForLevel(level, index);
  
  if (!puzzle) {
    return res.status(404).json({ error: 'Puzzle not found' });
  }
  
  res.json(puzzle);
});

/**
 * POST /synant-api/check
 * Checks the user's submission for Phase 1 or Phase 2
 */
router.post('/check', express.json(), (req, res) => {
  const { centerWord, submitted, phase } = req.body;
  
  if (!centerWord || !submitted || !phase) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Find the center word in the word bank
  const wordEntry = synAnt.WORD_BANK.find(
    w => w.word.toLowerCase() === centerWord.toLowerCase()
  );
  
  if (!wordEntry) {
    return res.status(404).json({ error: 'Center word not found' });
  }

  const results = [];
  let correctCount = 0;

  if (phase === 1) {
    // Phase 1: Check pairs
    submitted.forEach(item => {
      const { word, pairedWith, zone } = item;
      let correctZone = 'unrelated';
      
      if (wordEntry.synonyms.map(s => s.toLowerCase()).includes(pairedWith.toLowerCase())) {
        correctZone = 'synonym';
      } else if (wordEntry.antonyms.map(a => a.toLowerCase()).includes(pairedWith.toLowerCase())) {
        correctZone = 'antonym';
      }
      
      const correct = zone === correctZone;
      if (correct) correctCount++;
      
      results.push({
        word,
        pairedWith,
        correct,
        correctZone
      });
    });
  } else if (phase === 2) {
    // Phase 2: Check individual words
    submitted.forEach(item => {
      const { word, zone } = item;
      let correctZone = 'unrelated';
      
      if (wordEntry.synonyms.map(s => s.toLowerCase()).includes(word.toLowerCase())) {
        correctZone = 'synonym';
      } else if (wordEntry.antonyms.map(a => a.toLowerCase()).includes(word.toLowerCase())) {
        correctZone = 'antonym';
      }
      
      const correct = zone === correctZone;
      if (correct) correctCount++;
      
      results.push({
        word,
        correct,
        correctZone
      });
    });
  }

  const allCorrect = correctCount === submitted.length;
  const score = correctCount * 10;

  res.json({
    correct: allCorrect,
    score,
    results,
    wordCard: {
      word: wordEntry.word,
      definition: wordEntry.definition,
      example: wordEntry.example,
      synonyms: wordEntry.synonyms,
      antonyms: wordEntry.antonyms
    }
  });
});

module.exports = router;
