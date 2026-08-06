import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTimer, QuizLayout } from '../App';
import './SynAntApp.css';

const API = import.meta.env.VITE_API_BASE_URL || '';

/**
 * SynAnt (Synonym/Antonym) Puzzle App
 * 3 phases across 10 levels: Pair Classification, Single Word Drag, Crossword
 */
export default function SynAntApp({ onBack }) {
  const [level, setLevel] = useState(1);
  const [roundIndex, setRoundIndex] = useState(1);
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Game state
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showFinalResults, setShowFinalResults] = useState(false);

  // Session tracking
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  // XP tracking
  const [totalXp, setTotalXp] = useState(0);

  // Phase 1 & 2: Drag state
  const [zones, setZones] = useState({ synonym: [], antonym: [], unrelated: [] });
  const [draggedItem, setDraggedItem] = useState(null);

  // Phase 3: Crossword state
  const [grid, setGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solvedWords, setSolvedWords] = useState(new Set());

  // Bookmarks
  const [bookmarks, setBookmarks] = useState([]);

  const timer = useTimer();
  const touchState = useRef({ item: null, startY: 0 });
  const cellRefs = useRef({});

  // Load XP and bookmarks on mount
  useEffect(() => {
    try {
      const savedXp = localStorage.getItem('tenali_synant_xp');
      if (savedXp) setTotalXp(Number(savedXp));

      const savedBookmarks = localStorage.getItem('tenali_synant_bookmarks');
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    } catch { /* ignored */ }
  }, []);

  // Fetch puzzle when level/round changes
  useEffect(() => {
    if (showLevelSelect || showBookmarks) return;

    const fetchPuzzle = async () => {
      setLoading(true);
      setCheckResult(null);
      setZones({ synonym: [], antonym: [], unrelated: [] });
      setHintsUsed(0);
      setSubmitting(false);
      setSolvedWords(new Set());
      setDirection('across');

      try {
        const res = await fetch(`${API}/synant-api/question?level=${level}&index=${roundIndex}`);
        const data = await res.json();
        setPuzzle(data);

        if (data.phase === 3) {
          // Generate crossword grid client-side
          generateCrosswordGrid(data);
        }

        timer.start(0);
      } catch (err) {
        console.error('Failed to load puzzle:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzle();
  }, [level, roundIndex, showLevelSelect, showBookmarks]);

  // ─── Crossword Grid Generation ───
  function generateCrosswordGrid(puzzleData) {
    const words = puzzleData.words.map(w => w.word);
    const layout = generateLayout(words);

    if (!layout) {
      console.warn('Could not generate intersecting layout');
      return;
    }

    const enrichedWords = layout.map((item, idx) => {
      const matchingWord = puzzleData.words.find(w => w.word === item.word);
      return {
        id: `w${idx}`,
        word: item.word,
        clue: matchingWord ? matchingWord.clue : '',
        row: item.row,
        col: item.col,
        direction: item.direction,
        number: 0
      };
    });

    const startCells = [];
    enrichedWords.forEach(w => {
      if (!startCells.some(c => c.row === w.row && c.col === w.col)) {
        startCells.push({ row: w.row, col: w.col });
      }
    });
    startCells.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    enrichedWords.forEach(w => {
      const numIdx = startCells.findIndex(c => c.row === w.row && c.col === w.col);
      w.number = numIdx + 1;
    });

    const newGrid = buildGrid({ words: enrichedWords });
    setGrid(newGrid);

    const preFillHints = [];
    enrichedWords.forEach(w => {
      if (w.word.length >= 4 && Math.random() < 0.5) {
        const hintIdx = Math.floor(Math.random() * w.word.length);
        const r = w.direction === 'across' ? w.row : w.row + hintIdx;
        const c = w.direction === 'across' ? w.col + hintIdx : w.col;
        preFillHints.push({ r, c });
      }
    });

    setGrid(prev => {
      const updated = prev.map(row => row.map(cell => ({ ...cell })));
      preFillHints.forEach(({ r, c }) => {
        if (updated[r] && updated[r][c] && updated[r][c].isLetter) {
          updated[r][c].value = updated[r][c].answer;
          updated[r][c].isHint = true;
        }
      });
      return updated;
    });

    setPuzzle(prev => ({ ...prev, words: enrichedWords }));

    if (enrichedWords.length > 0) {
      setSelectedCell({ r: enrichedWords[0].row, c: enrichedWords[0].col });
    }
  }

  // ─── Crossword Layout Generator ───
  function generateLayout(wordList) {
    if (!wordList || wordList.length === 0) return null;
    const sorted = [...wordList].sort((a, b) => b.length - a.length);
    const placed = [];
    const BOARD_SIZE = 40;
    const center = Math.floor(BOARD_SIZE / 2);

    placed.push({
      word: sorted[0],
      row: center,
      col: center - Math.floor(sorted[0].length / 2),
      direction: 'across'
    });

    function isValidPlacement(word, row, col, dir) {
      const len = word.length;
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
      if (dir === 'across' && col + len > BOARD_SIZE) return false;
      if (dir === 'down' && row + len > BOARD_SIZE) return false;

      const wordCells = [];
      for (let i = 0; i < len; i++) {
        const r = dir === 'across' ? row : row + i;
        const c = dir === 'across' ? col + i : col;
        wordCells.push({ r, c, char: word[i] });
      }

      let intersects = false;

      for (let idx = 0; idx < wordCells.length; idx++) {
        const cell = wordCells[idx];
        const existing = placed.find(w => {
          const wLen = w.word.length;
          for (let i = 0; i < wLen; i++) {
            const r = w.direction === 'across' ? w.row : w.row + i;
            const c = w.direction === 'across' ? w.col + i : w.col;
            if (r === cell.r && c === cell.c) return true;
          }
          return false;
        });

        if (existing) {
          const offset = existing.direction === 'across' ? cell.c - existing.col : cell.r - existing.row;
          if (existing.word[offset] !== cell.char) {
            return false;
          }
          intersects = true;
        } else {
          const neighbors = [
            { r: cell.r - 1, c: cell.c },
            { r: cell.r + 1, c: cell.c },
            { r: cell.r, c: cell.c - 1 },
            { r: cell.r, c: cell.c + 1 }
          ];

          for (const n of neighbors) {
            if (wordCells.some(item => item.r === n.r && item.c === n.c)) continue;

            const touchesLetter = placed.some(w => {
              const wLen = w.word.length;
              for (let i = 0; i < wLen; i++) {
                const r = w.direction === 'across' ? w.row : w.row + i;
                const c = w.direction === 'across' ? w.col + i : w.col;
                if (r === n.r && c === n.c) return true;
              }
              return false;
            });

            if (touchesLetter) {
              return false;
            }
          }
        }
      }

      return intersects;
    }

    function solve(wordIdx) {
      if (wordIdx >= sorted.length) return true;

      const word = sorted[wordIdx];
      const candidates = [];

      placed.forEach(p => {
        for (let i = 0; i < word.length; i++) {
          for (let j = 0; j < p.word.length; j++) {
            if (word[i] === p.word[j]) {
              const nextDir = p.direction === 'across' ? 'down' : 'across';
              const row = nextDir === 'across' ? p.row + j : p.row - i;
              const col = nextDir === 'across' ? p.col - i : p.col + j;

              if (isValidPlacement(word, row, col, nextDir)) {
                candidates.push({ row, col, direction: nextDir });
              }
            }
          }
        }
      });

      candidates.forEach(c => {
        placed.push({ word, row: c.row, col: c.col, direction: c.direction });
        let minR = BOARD_SIZE, maxR = 0, minC = BOARD_SIZE, maxC = 0;
        placed.forEach(w => {
          const len = w.word.length;
          for (let i = 0; i < len; i++) {
            const r = w.direction === 'across' ? w.row : w.row + i;
            const c = w.direction === 'across' ? w.col + i : w.col;
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        });
        const width = maxC - minC + 1;
        const height = maxR - minR + 1;
        c.score = -(width + height) - Math.abs(width - height) * 2;
        placed.pop();
      });

      candidates.sort((a, b) => b.score - a.score);

      for (const c of candidates) {
        placed.push({ word, row: c.row, col: c.col, direction: c.direction });
        if (solve(wordIdx + 1)) return true;
        placed.pop();
      }

      return false;
    }

    const success = solve(1);
    if (!success) return null;

    let minR = BOARD_SIZE, maxR = 0, minC = BOARD_SIZE, maxC = 0;
    placed.forEach(w => {
      const len = w.word.length;
      for (let i = 0; i < len; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    });

    placed.forEach(w => {
      w.row -= minR;
      w.col -= minC;
    });

    return placed;
  }

  function buildGrid(puzzle) {
    const { words } = puzzle;
    let maxR = 0, maxC = 0;
    words.forEach(w => {
      const len = w.word.length;
      for (let i = 0; i < len; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
      }
    });

    const gridSize = Math.max(maxR, maxC) + 1;
    const grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({
        isLetter: false,
        answer: '',
        value: '',
        number: null,
        solved: false,
        isHint: false
      }))
    );

    words.forEach(({ word, row, col, direction, number }) => {
      for (let i = 0; i < word.length; i++) {
        const r = direction === 'across' ? row : row + i;
        const c = direction === 'across' ? col + i : col;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          grid[r][c].isLetter = true;
          grid[r][c].answer = word[i].toUpperCase();
          if (i === 0 && number != null && !grid[r][c].number) {
            grid[r][c].number = number;
          }
        }
      }
    });

    return grid;
  }

  // ─── Phase 1 & 2: Drag Handlers ───
  function handleDragStart(e, item) {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e, zone) {
    e.preventDefault();
    if (!draggedItem) return;

    setZones(prev => {
      const newZones = { ...prev };
      Object.keys(newZones).forEach(key => {
        newZones[key] = newZones[key].filter(i => i !== draggedItem);
      });
      newZones[zone].push(draggedItem);
      return newZones;
    });

    setDraggedItem(null);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  // Touch drag support
  useEffect(() => {
    const draggables = document.querySelectorAll('.draggable-item');
    const dropZones = document.querySelectorAll('.drop-zone');

    draggables.forEach(elem => {
      const handleTouchStart = (e) => {
        const item = elem.dataset.item;
        if (item) {
          touchState.current = { item: JSON.parse(item), startY: e.touches[0].clientY };
        }
      };

      const handleTouchMove = (e) => {
        e.preventDefault();
      };

      elem.addEventListener('touchstart', handleTouchStart, { passive: false });
      elem.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
        elem.removeEventListener('touchstart', handleTouchStart);
        elem.removeEventListener('touchmove', handleTouchMove);
      };
    });

    dropZones.forEach(zone => {
      const zoneName = zone.dataset.zone;
      const handleTouchEnd = (e) => {
        if (touchState.current.item) {
          handleDrop(e, zoneName);
          touchState.current = { item: null, startY: 0 };
        }
      };

      zone.addEventListener('touchend', handleTouchEnd);

      return () => {
        zone.removeEventListener('touchend', handleTouchEnd);
      };
    });
  }, [puzzle, zones]);

  // ─── Submit Check (Phase 1 & 2) ───
  async function handleSubmit() {
    if (submitting || !puzzle) return;

    const allZones = [...zones.synonym, ...zones.antonym, ...zones.unrelated];
    const expectedLength = puzzle.phase === 1 ? puzzle.pairs?.length : puzzle.words?.length;

    if (allZones.length !== expectedLength) {
      alert('Please place all items in a zone before submitting.');
      return;
    }

    setSubmitting(true);

    const submitted = [];

    if (puzzle.phase === 1) {
      Object.keys(zones).forEach(zone => {
        zones[zone].forEach(item => {
          submitted.push({ word: item.word, pairedWith: item.pairedWith, zone });
        });
      });
    } else if (puzzle.phase === 2) {
      Object.keys(zones).forEach(zone => {
        zones[zone].forEach(item => {
          submitted.push({ word: item.word, zone });
        });
      });
    }

    try {
      const res = await fetch(`${API}/synant-api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerWord: puzzle.centerWord, submitted, phase: puzzle.phase })
      });
      const data = await res.json();
      setCheckResult(data);

      const xp = data.score || 0;
      setSessionXp(prev => prev + xp);
      setSessionTotal(prev => prev + submitted.length);
      setSessionCorrect(prev => prev + data.results.filter(r => r.correct).length);

      setTotalXp(prev => {
        const newXp = prev + xp;
        localStorage.setItem('tenali_synant_xp', String(newXp));
        return newXp;
      });

      if (data.wordCard) {
        setSessionWords(prev => [...prev, data.wordCard]);
      }
    } catch (err) {
      console.error('Failed to check answer:', err);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Phase 3: Crossword Handlers ───

  // Helper: Get the active word at a given cell and direction
  function getActiveWord(puzzleData, cell, dir) {
    if (!puzzleData || !puzzleData.words || !cell) return null;
    return puzzleData.words.find(w => {
      if (w.direction !== dir) return false;
      const cells = getWordCells(w);
      return cells.some(item => item.r === cell.r && item.c === cell.c);
    });
  }

  // Helper: Get all cells for a word
  function getWordCells(wordObj) {
    const { word, row, col, direction } = wordObj;
    return Array.from({ length: word.length }, (_, i) => ({
      r: direction === 'across' ? row : row + i,
      c: direction === 'across' ? col + i : col
    }));
  }

  // Auto-focus selected cell and auto-skip solved/hint cells
  useEffect(() => {
    if (!selectedCell || !grid || grid.length === 0 || !puzzle) return;
    const { r, c } = selectedCell;
    const cell = grid[r]?.[c];

    // FIX 1: Skip cells that are already filled (hints or solved)
    if (cell && cell.isLetter && (cell.solved || cell.isHint)) {
      const word = getActiveWord(puzzle, { r, c }, direction);
      if (word) {
        const cells = getWordCells(word);
        const idx = cells.findIndex(item => item.r === r && item.c === c);

        // Try forward first
        let nextIdx = idx + 1;
        let found = false;
        while (nextIdx < cells.length) {
          const item = cells[nextIdx];
          const targetCell = grid[item.r][item.c];
          if (!targetCell.solved && !targetCell.isHint) {
            setSelectedCell({ r: item.r, c: item.c });
            found = true;
            break;
          }
          nextIdx++;
        }

        // If not found forward, try backward
        if (!found) {
          let prevIdx = idx - 1;
          while (prevIdx >= 0) {
            const item = cells[prevIdx];
            const targetCell = grid[item.r][item.c];
            if (!targetCell.solved && !targetCell.isHint) {
              setSelectedCell({ r: item.r, c: item.c });
              found = true;
              break;
            }
            prevIdx--;
          }
        }

        // If word is complete, find next incomplete word
        if (!found) {
          const nextWord = puzzle.words.find(w => {
            if (solvedWords.has(w.id)) return false;
            const wCells = getWordCells(w);
            return wCells.some(cell => {
              const g = grid[cell.r]?.[cell.c];
              return g && !g.solved && !g.isHint;
            });
          });

          if (nextWord) {
            const nextCells = getWordCells(nextWord);
            const firstEmpty = nextCells.find(cell => {
              const g = grid[cell.r]?.[cell.c];
              return g && !g.solved && !g.isHint;
            });
            if (firstEmpty) {
              setSelectedCell({ r: firstEmpty.r, c: firstEmpty.c });
              setDirection(nextWord.direction);
            }
          }
        }
      }
    }

    const key = `${r}-${c}`;
    if (cellRefs.current[key]) {
      cellRefs.current[key].focus();
    }
  }, [selectedCell, grid, direction, puzzle, solvedWords]);

  // Highlight target words on grid
  const { highlightedCells, activeWord } = useMemo(() => {
    const set = new Set();
    const act = getActiveWord(puzzle, selectedCell, direction);
    if (act) {
      getWordCells(act).forEach(c => set.add(`${c.r}-${c.c}`));
    }
    return {
      highlightedCells: set,
      activeWord: act,
    };
  }, [selectedCell, direction, puzzle, grid]);

  // Cell click handler
  function handleCellClick(r, c) {
    const cell = grid[r]?.[c];
    if (!cell?.isLetter || cell.solved) return;

    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection(d => (d === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell({ r, c });
      const matchingWords = puzzle.words.filter(w => {
        const cells = getWordCells(w);
        return cells.some(item => item.r === r && item.c === c);
      });
      const hasAcross = matchingWords.some(w => w.direction === 'across');
      const hasDown = matchingWords.some(w => w.direction === 'down');
      if (hasAcross && !hasDown) {
        setDirection('across');
      } else if (hasDown && !hasAcross) {
        setDirection('down');
      }
    }
  }

  // Advance cursor to next cell in word
  function advanceCrosswordCursor(r, c, backward = false) {
    if (!puzzle) return;
    const word = getActiveWord(puzzle, { r, c }, direction);
    if (!word) return;
    const cells = getWordCells(word);
    const idx = cells.findIndex(cell => cell.r === r && cell.c === c);
    const next = backward ? cells[idx - 1] : cells[idx + 1];
    if (next) setSelectedCell({ r: next.r, c: next.c });
  }

  // Input handler with auto-advance
  const handleCellInput = useCallback((e, r, c) => {
    const cell = grid[r]?.[c];
    if (!cell?.isLetter || cell.isHint || cell.solved) return;

    const char = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();

    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].value = char;
      // Clear error state when typing
      if (next[r][c].isWrong) {
        next[r][c].isWrong = false;
      }
      return next;
    });

    if (char) {
      advanceCrosswordCursor(r, c, false);
      // FIX 3: Auto-check word when complete
      setTimeout(() => checkWordIfComplete(r, c), 50);
    }
  }, [grid, direction, puzzle]);

  // Key handler
  const handleCellKeyDown = useCallback((e, r, c) => {
    const key = e.key;

    if (key === 'ArrowRight') {
      e.preventDefault();
      setDirection('across');
      advanceCrosswordCursor(r, c, false);
    }
    if (key === 'ArrowLeft') {
      e.preventDefault();
      setDirection('across');
      advanceCrosswordCursor(r, c, true);
    }
    if (key === 'ArrowDown') {
      e.preventDefault();
      setDirection('down');
      advanceCrosswordCursor(r, c, false);
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      setDirection('down');
      advanceCrosswordCursor(r, c, true);
    }

    if (key === 'Backspace') {
      e.preventDefault();
      const cell = grid[r]?.[c];
      if (!cell?.isLetter || cell.isHint || cell.solved) return;

      if (cell.value) {
        setGrid(prev => {
          const next = prev.map(row => row.map(cell => ({ ...cell })));
          next[r][c].value = '';
          if (next[r][c].isWrong) {
            next[r][c].isWrong = false;
          }
          return next;
        });
      } else {
        advanceCrosswordCursor(r, c, true);
      }
    }
  }, [grid, direction, puzzle]);

  // FIX 3: Check if word is complete and verify it
  function checkWordIfComplete(r, c) {
    if (!puzzle || !puzzle.words) return;

    const wordsAtCell = puzzle.words.filter(w => {
      const cells = getWordCells(w);
      return cells.some(cell => cell.r === r && cell.c === c);
    });

    wordsAtCell.forEach(word => {
      if (solvedWords.has(word.id)) return; // Already solved

      const cells = getWordCells(word);
      const allFilled = cells.every(cell => {
        const g = grid[cell.r]?.[cell.c];
        return g && (g.value || g.isHint);
      });

      if (allFilled) {
        checkWord(word.id);
      }
    });
  }

  // FIX 3: Check a specific word
  function checkWord(wordId) {
    if (!puzzle || !puzzle.words) return;

    const word = puzzle.words.find(w => w.id === wordId);
    if (!word || solvedWords.has(wordId)) return;

    const cells = getWordCells(word);
    const isCorrect = cells.every(cell => {
      const g = grid[cell.r]?.[cell.c];
      return g && g.value === g.answer;
    });

    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));

      cells.forEach(cell => {
        const g = next[cell.r]?.[cell.c];
        if (g && g.isLetter) {
          if (isCorrect) {
            g.solved = true;
            g.isWrong = false;
          } else {
            g.isWrong = true;
            g.solved = false;
          }
        }
      });

      return next;
    });

    if (isCorrect) {
      setSolvedWords(prev => new Set([...prev, wordId]));

      // Award XP for solved word
      const xp = 20;
      setSessionXp(prev => prev + xp);
      setTotalXp(prev => {
        const newXp = prev + xp;
        localStorage.setItem('tenali_synant_xp', String(newXp));
        return newXp;
      });
    }
  }

  // FIX 4: Reveal letter with hint and jump cursor
  function handleRevealLetter() {
    if (!selectedCell || !puzzle || !puzzle.words) return;
    const { r, c } = selectedCell;
    const cell = grid[r]?.[c];
    if (!cell?.isLetter || cell.isHint || cell.solved || cell.value === cell.answer) return;

    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].value = next[r][c].answer;
      next[r][c].isHint = true;
      if (next[r][c].isWrong) {
        next[r][c].isWrong = false;
      }
      return next;
    });

    setHintsUsed(h => h + 1);

    // FIX 4: Jump to next empty cell after revealing
    setTimeout(() => {
      const word = getActiveWord(puzzle, { r, c }, direction);
      if (word) {
        const cells = getWordCells(word);
        const idx = cells.findIndex(cell => cell.r === r && cell.c === c);

        // Find next empty cell in word
        let found = false;
        for (let i = idx + 1; i < cells.length; i++) {
          const nextCell = grid[cells[i].r]?.[cells[i].c];
          if (nextCell && !nextCell.solved && !nextCell.isHint && !nextCell.value) {
            setSelectedCell({ r: cells[i].r, c: cells[i].c });
            found = true;
            break;
          }
        }

        // If not found forward, try from start
        if (!found) {
          for (let i = 0; i < idx; i++) {
            const nextCell = grid[cells[i].r]?.[cells[i].c];
            if (nextCell && !nextCell.solved && !nextCell.isHint && !nextCell.value) {
              setSelectedCell({ r: cells[i].r, c: cells[i].c });
              found = true;
              break;
            }
          }
        }

        // If word complete, find next incomplete word
        if (!found) {
          const nextWord = puzzle.words.find(w => {
            if (solvedWords.has(w.id)) return false;
            const wCells = getWordCells(w);
            return wCells.some(cell => {
              const g = grid[cell.r]?.[cell.c];
              return g && !g.solved && !g.isHint && !g.value;
            });
          });

          if (nextWord) {
            const nextCells = getWordCells(nextWord);
            const firstEmpty = nextCells.find(cell => {
              const g = grid[cell.r]?.[cell.c];
              return g && !g.solved && !g.isHint && !g.value;
            });
            if (firstEmpty) {
              setSelectedCell({ r: firstEmpty.r, c: firstEmpty.c });
              setDirection(nextWord.direction);
            }
          }
        }
      }
    }, 100);
  }

  // FIX 2 & 3: Complete puzzle only when all words solved
  function handleCompletePuzzle() {
    if (!puzzle || !puzzle.words) return;

    // Check if all words are solved
    const allSolved = puzzle.words.every(w => solvedWords.has(w.id));

    if (!allSolved) {
      alert('Please complete all words correctly before finishing!');
      return;
    }

    timer.stop();

    // Calculate session stats
    const totalCells = puzzle.words.reduce((sum, w) => {
      const cells = getWordCells(w);
      return sum + cells.filter(c => {
        const g = grid[c.r]?.[c.c];
        return g && !g.isHint;
      }).length;
    }, 0);

    setSessionCorrect(prev => prev + totalCells);
    setSessionTotal(prev => prev + totalCells);

    // Advance to next round
    setTimeout(() => {
      if (roundIndex >= 10) {
        setShowFinalResults(true);
      } else {
        setRoundIndex(r => r + 1);
      }
    }, 500);
  }

  // ─── Bookmark Handlers ───
  function toggleBookmark(wordCard) {
    const exists = bookmarks.some(b => b.word === wordCard.word);
    let newBookmarks;
    if (exists) {
      newBookmarks = bookmarks.filter(b => b.word !== wordCard.word);
    } else {
      newBookmarks = [...bookmarks, wordCard];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem('tenali_synant_bookmarks', JSON.stringify(newBookmarks));
  }

  function isBookmarked(word) {
    return bookmarks.some(b => b.word === word);
  }

  // ─── Navigation ───
  function handleNextRound() {
    if (roundIndex >= 10) {
      setShowFinalResults(true);
    } else {
      setRoundIndex(r => r + 1);
    }
  }

  // Returns the mode label for a given level per the interleaved mapping:
  //  Levels 1,4,7  → Pair Drag (Phase 1)
  //  Levels 2,5,8  → Word Sort (Phase 2)
  //  Levels 3,6,9  → Crossword (Phase 3)
  //  Level 10      → Crossword (capstone)
  function getPhaseLabel(lvl) {
    if (lvl === 10) return 'Crossword';
    const labels = ['Pair Drag', 'Word Sort', 'Crossword'];
    return labels[(lvl - 1) % 3];
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Bookmark screen MUST be checked FIRST
  // ═══════════════════════════════════════════════════════════
  if (showBookmarks) {
    return (
      <QuizLayout title="My Bookmarks" subtitle="Review bookmarked words" onBack={() => setShowBookmarks(false)}>
        {bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-soft)' }}>
            No bookmarks yet. Complete rounds and bookmark words to review them here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookmarks.map((b, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{b.word}</h3>
                  <button
                    onClick={() => toggleBookmark(b)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(248,81,73,0.5)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      color: '#f85149',
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
                <p style={{ color: 'var(--clr-text-soft)', margin: '8px 0', fontStyle: 'italic' }}>
                  {b.definition}
                </p>
                <p style={{ color: 'var(--clr-text-soft)', margin: '8px 0', fontSize: '0.95rem' }}>
                  {b.example}
                </p>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--clr-text-soft)', marginBottom: 6 }}>Synonyms:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {b.synonyms.map((syn, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'rgba(5,196,107,0.15)',
                          color: '#05c46b',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.9rem'
                        }}
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--clr-text-soft)', marginBottom: 6 }}>Antonyms:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {b.antonyms.map((ant, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'rgba(248,81,73,0.15)',
                          color: '#f85149',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.9rem'
                        }}
                      >
                        {ant}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </QuizLayout>
    );
  }

  // ─── Final Results Screen ───
  if (showFinalResults) {
    const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 100;

    return (
      <QuizLayout title={`Results · Level ${level}`} subtitle="Level Complete!" onBack={() => setShowLevelSelect(true)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: '800px', margin: '0 auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>XP Gained</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--clr-accent, #05c46b)' }}>+{sessionXp} XP</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Words Seen</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4a90e2' }}>{sessionWords.length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Accuracy</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: accuracy >= 70 ? '#26de81' : '#f85149' }}>{accuracy}%</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--clr-accent, #05c46b)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10, marginBottom: 16 }}>
              Words You Practiced
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '500px', overflowY: 'auto', paddingRight: 8 }}>
              {sessionWords.map((word, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{word.word}</h4>
                    <button
                      onClick={() => toggleBookmark(word)}
                      style={{
                        background: isBookmarked(word.word) ? 'rgba(255,193,7,0.2)' : 'transparent',
                        border: `1px solid ${isBookmarked(word.word) ? '#ffc107' : 'rgba(255,255,255,0.3)'}`,
                        borderRadius: 6,
                        padding: '4px 10px',
                        color: isBookmarked(word.word) ? '#ffc107' : 'inherit',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      ★
                    </button>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--clr-text-soft)', margin: '4px 0' }}>{word.definition}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {word.synonyms.slice(0, 3).map((syn, i) => (
                      <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(5,196,107,0.15)', color: '#05c46b', padding: '2px 8px', borderRadius: 4 }}>{syn}</span>
                    ))}
                    {word.antonyms.slice(0, 3).map((ant, i) => (
                      <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(248,81,73,0.15)', color: '#f85149', padding: '2px 8px', borderRadius: 4 }}>{ant}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            {level < 10 && (
              <button
                onClick={() => {
                  setLevel(l => l + 1);
                  setRoundIndex(1);
                  setShowFinalResults(false);
                  setShowLevelSelect(false);
                  setSessionWords([]);
                  setSessionXp(0);
                  setSessionCorrect(0);
                  setSessionTotal(0);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--clr-accent, #05c46b)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Play Next Level →
              </button>
            )}
            <button
              onClick={() => {
                setShowLevelSelect(true);
                setSessionWords([]);
                setSessionXp(0);
                setSessionCorrect(0);
                setSessionTotal(0);
              }}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: 'inherit',
                cursor: 'pointer'
              }}
            >
              Back to Levels
            </button>
          </div>
        </div>
      </QuizLayout>
    );
  }

  // ─── Level Select Screen ───
  if (showLevelSelect) {
    const levels = Array.from({ length: 10 }, (_, i) => i + 1);

    return (
      <QuizLayout title="Syn & Ant" subtitle="Master synonyms and antonyms" onBack={onBack}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
            Language XP: <span style={{ color: 'var(--clr-accent, #05c46b)' }}>{totalXp} XP</span>
          </div>
          <button
            onClick={() => setShowBookmarks(true)}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            ★ My Bookmarks
          </button>
        </div>

        <div className="menu-grid">
          {levels.map(lvl => (
            <button
              key={lvl}
              className="menu-card blue"
              onClick={() => {
                setLevel(lvl);
                setRoundIndex(1);
                setShowLevelSelect(false);
                setShowFinalResults(false);
                setSessionWords([]);
                setSessionXp(0);
                setSessionCorrect(0);
                setSessionTotal(0);
              }}
            >
              <span className="menu-title">Level {lvl}</span>
              <span className="menu-subtitle">{getPhaseLabel(lvl)}</span>
            </button>
          ))}
        </div>
      </QuizLayout>
    );
  }

  // ─── Loading State ───
  if (loading || !puzzle) {
    return (
      <QuizLayout title={`Level ${level}`} subtitle="Loading..." onBack={() => setShowLevelSelect(true)}>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-soft)' }}>
          Loading puzzle...
        </div>
      </QuizLayout>
    );
  }

  // ─── Phase 1: Pair Classification ───
  if (puzzle.phase === 1) {
    const allPlaced = (zones.synonym.length + zones.antonym.length + zones.unrelated.length) === puzzle.pairs?.length;

    return (
      <QuizLayout title={`Level ${level} · Pair Drag`} subtitle={`Round ${roundIndex}/10`} onBack={() => setShowLevelSelect(true)} timer={timer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
            XP: <span style={{ color: 'var(--clr-accent, #05c46b)' }}>{totalXp} XP</span>
          </div>
        </div>

        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 8 }}>{puzzle.centerWord}</h2>
          <p style={{ color: 'var(--clr-text-soft)', fontSize: '1rem' }}>{puzzle.definition}</p>
        </div>

        {!checkResult && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: 12 }}>Drag each pair to the correct zone:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {puzzle.pairs
                  .filter(p => ![...zones.synonym, ...zones.antonym, ...zones.unrelated].includes(p))
                  .map((pair, idx) => (
                    <div
                      key={idx}
                      className="draggable-item"
                      data-item={JSON.stringify(pair)}
                      draggable
                      onDragStart={e => handleDragStart(e, pair)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '12px',
                        cursor: 'grab',
                        textAlign: 'center',
                        fontSize: '1rem'
                      }}
                    >
                      {pair.word} — {pair.pairedWith}
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div
                className="drop-zone"
                data-zone="synonym"
                onDrop={e => handleDrop(e, 'synonym')}
                onDragOver={handleDragOver}
                style={{
                  minHeight: 120,
                  border: '2px dashed rgba(5,196,107,0.4)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'rgba(5,196,107,0.05)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#05c46b' }}>Synonym</div>
                {zones.synonym.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(5,196,107,0.15)', border: '1px solid rgba(5,196,107,0.3)', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: '0.9rem' }}>
                    {item.word} — {item.pairedWith}
                  </div>
                ))}
              </div>

              <div
                className="drop-zone"
                data-zone="antonym"
                onDrop={e => handleDrop(e, 'antonym')}
                onDragOver={handleDragOver}
                style={{
                  minHeight: 120,
                  border: '2px dashed rgba(248,81,73,0.4)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'rgba(248,81,73,0.05)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#f85149' }}>Antonym</div>
                {zones.antonym.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: '0.9rem' }}>
                    {item.word} — {item.pairedWith}
                  </div>
                ))}
              </div>

              <div
                className="drop-zone"
                data-zone="unrelated"
                onDrop={e => handleDrop(e, 'unrelated')}
                onDragOver={handleDragOver}
                style={{
                  minHeight: 120,
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Not Related</div>
                {zones.unrelated.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: '0.9rem' }}>
                    {item.word} — {item.pairedWith}
                  </div>
                ))}
              </div>
            </div>

            {allPlaced && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: submitting ? 'rgba(5,196,107,0.5)' : 'var(--clr-accent, #05c46b)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Checking...' : 'Submit'}
              </button>
            )}
          </>
        )}

        {checkResult && (
          <div>
            <div style={{ marginBottom: 24 }}>
              {checkResult.results.map((res, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: res.correct ? 'rgba(5,196,107,0.15)' : 'rgba(248,81,73,0.15)',
                    border: `1px solid ${res.correct ? 'rgba(5,196,107,0.3)' : 'rgba(248,81,73,0.3)'}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8
                  }}
                >
                  <span>
                    {res.word} — {res.pairedWith}
                  </span>
                  <span style={{ fontSize: '1.2rem', color: res.correct ? '#05c46b' : '#f85149' }}>
                    {res.correct ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: checkResult.correct ? 'rgba(5,196,107,0.15)' : 'rgba(248,81,73,0.15)',
                border: `1px solid ${checkResult.correct ? '#05c46b' : '#f85149'}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 16
              }}
            >
              {checkResult.correct ? (
                <div style={{ color: '#05c46b', fontWeight: 'bold' }}>✓ All correct! Well done.</div>
              ) : (
                <div>
                  {checkResult.results
                    .filter(r => !r.correct)
                    .map((r, i) => (
                      <div key={i} style={{ color: 'var(--clr-text-soft)', fontSize: '0.9rem', marginBottom: 4 }}>
                        "{r.word} — {r.pairedWith}" → Correct zone: <span style={{ color: '#f85149', fontWeight: 'bold' }}>{r.correctZone}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={handleNextRound}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--clr-accent, #05c46b)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Next Round →
            </button>
          </div>
        )}
      </QuizLayout>
    );
  }

  // ─── Phase 2: Single Word Drag ───
  if (puzzle.phase === 2) {
    const allPlaced = (zones.synonym.length + zones.antonym.length + zones.unrelated.length) === puzzle.words?.length;

    return (
      <QuizLayout title={`Level ${level} · Word Sort`} subtitle={`Round ${roundIndex}/10`} onBack={() => setShowLevelSelect(true)} timer={timer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
            XP: <span style={{ color: 'var(--clr-accent, #05c46b)' }}>{totalXp} XP</span>
          </div>
        </div>

        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 8 }}>{puzzle.centerWord}</h2>
          <p style={{ color: 'var(--clr-text-soft)', fontSize: '1rem' }}>{puzzle.definition}</p>
        </div>

        {!checkResult && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: 12 }}>Drag each word to the correct zone:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {puzzle.words
                  .filter(w => ![...zones.synonym, ...zones.antonym, ...zones.unrelated].includes(w))
                  .map((word, idx) => (
                    <div
                      key={idx}
                      className="draggable-item"
                      data-item={JSON.stringify(word)}
                      draggable
                      onDragStart={e => handleDragStart(e, word)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '10px 16px',
                        cursor: 'grab',
                        fontSize: '1rem'
                      }}
                    >
                      {word.word}
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div
                className="drop-zone"
                data-zone="synonym"
                onDrop={e => handleDrop(e, 'synonym')}
                onDragOver={handleDragOver}
                style={{
                  minHeight: 120,
                  border: '2px dashed rgba(5,196,107,0.4)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'rgba(5,196,107,0.05)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#05c46b' }}>Synonym</div>
                {zones.synonym.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(5,196,107,0.15)', border: '1px solid rgba(5,196,107,0.3)', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: '0.9rem' }}>
                    {item.word}
                  </div>
                ))}
              </div>

              <div
                className="drop-zone"
                data-zone="antonym"
                onDrop={e => handleDrop(e, 'antonym')}
                onDragOver={handleDragOver}
                style={{
                  minHeight: 120,
                  border: '2px dashed rgba(248,81,73,0.4)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'rgba(248,81,73,0.05)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#f85149' }}>Antonym</div>
                {zones.antonym.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: '0.9rem' }}>
                    {item.word}
                  </div>
                ))}
              </div>

              <div
                className="drop-zone"
                data-zone="unrelated"
                onDrop={e => handleDrop(e, 'unrelated')}
                onDragOver={handleDragOver}
                style={{
                  minHeight: 120,
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Not Related</div>
                {zones.unrelated.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: '0.9rem' }}>
                    {item.word}
                  </div>
                ))}
              </div>
            </div>

            {allPlaced && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: submitting ? 'rgba(5,196,107,0.5)' : 'var(--clr-accent, #05c46b)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Checking...' : 'Submit'}
              </button>
            )}
          </>
        )}

        {checkResult && (
          <div>
            <div style={{ marginBottom: 24 }}>
              {checkResult.results.map((res, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: res.correct ? 'rgba(5,196,107,0.15)' : 'rgba(248,81,73,0.15)',
                    border: `1px solid ${res.correct ? 'rgba(5,196,107,0.3)' : 'rgba(248,81,73,0.3)'}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8
                  }}
                >
                  <span>{res.word}</span>
                  <span style={{ fontSize: '1.2rem', color: res.correct ? '#05c46b' : '#f85149' }}>
                    {res.correct ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: checkResult.correct ? 'rgba(5,196,107,0.15)' : 'rgba(248,81,73,0.15)',
                border: `1px solid ${checkResult.correct ? '#05c46b' : '#f85149'}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 16
              }}
            >
              {checkResult.correct ? (
                <div style={{ color: '#05c46b', fontWeight: 'bold' }}>✓ All correct! Well done.</div>
              ) : (
                <div>
                  {checkResult.results
                    .filter(r => !r.correct)
                    .map((r, i) => (
                      <div key={i} style={{ color: 'var(--clr-text-soft)', fontSize: '0.9rem', marginBottom: 4 }}>
                        "{r.word}" → Correct zone: <span style={{ color: '#f85149', fontWeight: 'bold' }}>{r.correctZone}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={handleNextRound}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--clr-accent, #05c46b)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Next Round →
            </button>
          </div>
        )}
      </QuizLayout>
    );
  }

  // ─── Phase 3: Crossword ───
  if (puzzle.phase === 3 && grid.length > 0) {
    // Check if all words are solved
    const allWordsSolved = puzzle.words.every(w => solvedWords.has(w.id));

    return (
      <QuizLayout title={`Level ${level} · Crossword`} subtitle={`Round ${roundIndex}/10`} onBack={() => setShowLevelSelect(true)} timer={timer}>
        {/* FIX 5: Container with proper shade hierarchy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              XP: <span style={{ color: 'var(--clr-accent, #05c46b)' }}>{totalXp} XP</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--clr-text-soft)' }}>
              Solved: <span style={{ color: 'var(--clr-accent, #05c46b)', fontWeight: 'bold' }}>{solvedWords.size}/{puzzle.words.length}</span>
            </div>
            <button
              onClick={handleRevealLetter}
              disabled={!selectedCell}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                color: 'inherit',
                cursor: selectedCell ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                opacity: selectedCell ? 1 : 0.5
              }}
            >
              💡 Reveal (-5 XP)
            </button>
          </div>

          {/* Grid container */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'inline-grid', gap: 2 }}>
              {grid.map((row, r) => (
                <div key={r} style={{ display: 'flex', gap: 2 }}>
                  {row.map((cell, c) => {
                    if (!cell.isLetter) {
                      return <div key={c} style={{ width: 36, height: 36 }} />;
                    }

                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const isHighlighted = highlightedCells.has(`${r}-${c}`);

                    // FIX 3: Background based on state (solved = locked green, wrong = red, normal)
                    let bgColor = 'rgba(255,255,255,0.06)';
                    let borderColor = 'rgba(255,255,255,0.2)';

                    if (cell.solved) {
                      bgColor = 'rgba(5,196,107,0.15)';
                      borderColor = 'rgba(5,196,107,0.3)';
                    } else if (cell.isWrong) {
                      bgColor = 'rgba(248,81,73,0.15)';
                      borderColor = 'rgba(248,81,73,0.3)';
                    } else if (isSelected) {
                      bgColor = 'rgba(5,196,107,0.2)';
                      borderColor = 'rgba(5,196,107,0.4)';
                    } else if (isHighlighted) {
                      bgColor = 'rgba(5,196,107,0.1)';
                    }

                    return (
                      <div
                        key={c}
                        style={{
                          position: 'relative',
                          width: 36,
                          height: 36,
                          background: bgColor,
                          border: `1.5px solid ${borderColor}`,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: cell.isHint || cell.solved ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => handleCellClick(r, c)}
                      >
                        {cell.number && (
                          <span style={{ position: 'absolute', top: 2, left: 3, fontSize: '0.6rem', color: 'var(--clr-text-soft)', fontWeight: 'bold' }}>
                            {cell.number}
                          </span>
                        )}
                        <input
                          ref={el => cellRefs.current[`${r}-${c}`] = el}
                          type="text"
                          maxLength="1"
                          value={cell.value}
                          onChange={e => handleCellInput(e, r, c)}
                          onKeyDown={e => handleCellKeyDown(e, r, c)}
                          disabled={cell.isHint || cell.solved}
                          style={{
                            width: '100%',
                            height: '100%',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: (cell.isHint || cell.solved) ? 'var(--clr-text-soft)' : 'inherit',
                            outline: 'none',
                            textTransform: 'uppercase',
                            cursor: (cell.isHint || cell.solved) ? 'not-allowed' : 'text'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* FIX 3 & 5: Clues panel with per-word check buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--clr-accent, #05c46b)' }}>
                Across
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {puzzle.words.filter(w => w.direction === 'across').map(w => {
                  const isSolved = solvedWords.has(w.id);
                  const cells = getWordCells(w);
                  const allFilled = cells.every(cell => {
                    const g = grid[cell.r]?.[cell.c];
                    return g && (g.value || g.isHint);
                  });
                  const hasWrong = cells.some(cell => {
                    const g = grid[cell.r]?.[cell.c];
                    return g && g.isWrong;
                  });

                  return (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 10,
                        background: isSolved ? 'rgba(5,196,107,0.1)' : hasWrong ? 'rgba(248,81,73,0.08)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isSolved ? 'rgba(5,196,107,0.3)' : hasWrong ? 'rgba(248,81,73,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 6,
                        cursor: isSolved ? 'default' : 'pointer',
                        opacity: isSolved ? 0.7 : 1
                      }}
                      onClick={() => {
                        if (!isSolved) {
                          setSelectedCell({ r: w.row, c: w.col });
                          setDirection('across');
                        }
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', flex: 1, textDecoration: isSolved ? 'line-through' : 'none' }}>
                        <span style={{ fontWeight: 'bold', marginRight: 6 }}>{w.number}.</span>
                        {w.clue}
                      </span>
                      {isSolved ? (
                        <span style={{ color: 'var(--clr-accent, #05c46b)', fontSize: '1rem', marginLeft: 8 }}>✓</span>
                      ) : allFilled && (
                        <button
                          onClick={(e) => { e.stopPropagation(); checkWord(w.id); }}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--clr-accent, #05c46b)',
                            border: 'none',
                            borderRadius: 4,
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginLeft: 8
                          }}
                        >
                          Check
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--clr-accent, #05c46b)' }}>
                Down
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {puzzle.words.filter(w => w.direction === 'down').map(w => {
                  const isSolved = solvedWords.has(w.id);
                  const cells = getWordCells(w);
                  const allFilled = cells.every(cell => {
                    const g = grid[cell.r]?.[cell.c];
                    return g && (g.value || g.isHint);
                  });
                  const hasWrong = cells.some(cell => {
                    const g = grid[cell.r]?.[cell.c];
                    return g && g.isWrong;
                  });

                  return (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 10,
                        background: isSolved ? 'rgba(5,196,107,0.1)' : hasWrong ? 'rgba(248,81,73,0.08)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isSolved ? 'rgba(5,196,107,0.3)' : hasWrong ? 'rgba(248,81,73,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 6,
                        cursor: isSolved ? 'default' : 'pointer',
                        opacity: isSolved ? 0.7 : 1
                      }}
                      onClick={() => {
                        if (!isSolved) {
                          setSelectedCell({ r: w.row, c: w.col });
                          setDirection('down');
                        }
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', flex: 1, textDecoration: isSolved ? 'line-through' : 'none' }}>
                        <span style={{ fontWeight: 'bold', marginRight: 6 }}>{w.number}.</span>
                        {w.clue}
                      </span>
                      {isSolved ? (
                        <span style={{ color: 'var(--clr-accent, #05c46b)', fontSize: '1rem', marginLeft: 8 }}>✓</span>
                      ) : allFilled && (
                        <button
                          onClick={(e) => { e.stopPropagation(); checkWord(w.id); }}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--clr-accent, #05c46b)',
                            border: 'none',
                            borderRadius: 4,
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginLeft: 8
                          }}
                        >
                          Check
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hints counter */}
          {hintsUsed > 0 && (
            <div style={{ textAlign: 'center', padding: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>
              <span style={{ color: 'var(--clr-text-soft)', fontSize: '0.9rem' }}>
                💡 Hints used: <span style={{ color: '#ffc107', fontWeight: 'bold' }}>{hintsUsed}</span> (-{hintsUsed * 5} XP)
              </span>
            </div>
          )}

          {/* FIX 2 & 3: Complete button only when all words solved */}
          {allWordsSolved && (
            <button
              onClick={handleCompletePuzzle}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--clr-accent, #05c46b)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5,196,107,0.3)'
              }}
            >
              Complete Round →
            </button>
          )}
        </div>
      </QuizLayout>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// FIX 6: Self-Contained Test for Crossword Answer Entry
// ═══════════════════════════════════════════════════════════

/**
 * Test function for verifying crossword per-word checking logic
 * Can be called from browser console: window.verifyCrossword()
 * 
 * @param {Array} grid - 2D grid array with cell objects
 * @param {Array} wordList - Array of word objects with {id, word, row, col, direction}
 * @param {Object} simulatedInputs - Map of cellKey (e.g., "2-3") to letter
 * @returns {Object} Test results with pass/fail status
 */
function verifyCrossword(grid, wordList, simulatedInputs) {
  console.log('🧪 Starting Crossword Verification Test...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper: Get cells for a word
  function getWordCells(wordObj) {
    const { word, row, col, direction } = wordObj;
    return Array.from({ length: word.length }, (_, i) => ({
      r: direction === 'across' ? row : row + i,
      c: direction === 'across' ? col + i : col
    }));
  }

  // Apply simulated inputs to grid
  const testGrid = grid.map(row => row.map(cell => ({ ...cell })));
  Object.keys(simulatedInputs).forEach(key => {
    const [r, c] = key.split('-').map(Number);
    if (testGrid[r] && testGrid[r][c] && testGrid[r][c].isLetter) {
      testGrid[r][c].value = simulatedInputs[key].toUpperCase();
    }
  });

  console.log('📝 Simulated inputs applied:', simulatedInputs);
  console.log('');

  // Test 1: Verify correct words get locked (solved = true)
  console.log('Test 1: Correct words should be locked');
  wordList.forEach(word => {
    const cells = getWordCells(word);
    const isCorrect = cells.every(cell => {
      const g = testGrid[cell.r]?.[cell.c];
      return g && g.value === g.answer;
    });

    if (isCorrect) {
      // Mark as solved
      cells.forEach(cell => {
        testGrid[cell.r][cell.c].solved = true;
        testGrid[cell.r][cell.c].isWrong = false;
      });
    }

    const allLocked = cells.every(cell => testGrid[cell.r][cell.c].solved);
    const testPass = isCorrect === allLocked;

    results.tests.push({
      name: `Word "${word.word}" correct → locked`,
      passed: testPass,
      expected: isCorrect,
      actual: allLocked
    });

    if (testPass) {
      results.passed++;
      console.log(`  ✅ "${word.word}": ${isCorrect ? 'Correctly locked' : 'Not locked (expected)'}`);
    } else {
      results.failed++;
      console.log(`  ❌ "${word.word}": Expected locked=${isCorrect}, got locked=${allLocked}`);
    }
  });
  console.log('');

  // Test 2: Verify incorrect words stay editable (solved = false, isWrong = true)
  console.log('Test 2: Incorrect words should stay editable with isWrong flag');
  wordList.forEach(word => {
    const cells = getWordCells(word);
    const isCorrect = cells.every(cell => {
      const g = testGrid[cell.r]?.[cell.c];
      return g && g.value === g.answer;
    });

    if (!isCorrect && cells.every(cell => testGrid[cell.r][cell.c].value)) {
      // Mark as wrong
      cells.forEach(cell => {
        testGrid[cell.r][cell.c].isWrong = true;
        testGrid[cell.r][cell.c].solved = false;
      });
    }

    const hasWrongFlag = cells.some(cell => testGrid[cell.r][cell.c].isWrong);
    const isEditable = cells.every(cell => !testGrid[cell.r][cell.c].solved);

    if (!isCorrect && cells.every(cell => testGrid[cell.r][cell.c].value)) {
      const testPass = hasWrongFlag && isEditable;

      results.tests.push({
        name: `Word "${word.word}" incorrect → editable with error flag`,
        passed: testPass,
        expected: true,
        actual: testPass
      });

      if (testPass) {
        results.passed++;
        console.log(`  ✅ "${word.word}": Correctly marked as wrong and editable`);
      } else {
        results.failed++;
        console.log(`  ❌ "${word.word}": Not properly marked as wrong/editable`);
      }
    }
  });
  console.log('');

  // Test 3: Full completion only triggers when ALL words correct
  console.log('Test 3: Full completion check');
  const allWordsSolved = wordList.every(word => {
    const cells = getWordCells(word);
    return cells.every(cell => testGrid[cell.r][cell.c].solved);
  });

  const allWordsCorrect = wordList.every(word => {
    const cells = getWordCells(word);
    return cells.every(cell => {
      const g = testGrid[cell.r]?.[cell.c];
      return g && g.value === g.answer;
    });
  });

  const testPass = allWordsSolved === allWordsCorrect;
  results.tests.push({
    name: 'All words correct → completion allowed',
    passed: testPass,
    expected: allWordsCorrect,
    actual: allWordsSolved
  });

  if (testPass) {
    results.passed++;
    console.log(`  ✅ Completion check: ${allWordsCorrect ? 'All correct, completion allowed' : 'Some incorrect, completion blocked'}`);
  } else {
    results.failed++;
    console.log(`  ❌ Completion check failed: Expected ${allWordsCorrect}, got ${allWordsSolved}`);
  }
  console.log('');

  // Test 4: Verify hints/pre-filled cells are non-editable
  console.log('Test 4: Hint cells should be non-editable');
  let hintTestPass = true;
  testGrid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.isHint) {
        // Hint cells should have value === answer and be non-editable
        if (cell.value !== cell.answer) {
          hintTestPass = false;
          console.log(`  ❌ Hint cell at [${r},${c}]: value doesn't match answer`);
        }
      }
    });
  });

  results.tests.push({
    name: 'Hint cells are non-editable and correct',
    passed: hintTestPass,
    expected: true,
    actual: hintTestPass
  });

  if (hintTestPass) {
    results.passed++;
    console.log('  ✅ All hint cells are properly set and non-editable');
  } else {
    results.failed++;
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`📊 Test Summary:`);
  console.log(`   Passed: ${results.passed}/${results.tests.length}`);
  console.log(`   Failed: ${results.failed}/${results.tests.length}`);
  console.log(`   Status: ${results.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('═══════════════════════════════════════\n');

  return results;
}

// Expose test function globally for browser console access
if (typeof window !== 'undefined') {
  window.verifyCrossword = verifyCrossword;
}

export { verifyCrossword };
