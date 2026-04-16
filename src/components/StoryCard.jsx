import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { load, save, relTime, cs, analyzeSentiment, estimateReadTime, timeAgo, detectTopic, updateStreak } from '../utils/helpers.js';
import { COMMON_WORDS, LS, NEWS_CATEGORIES, INTERESTS, TRENDING_STOP } from '../utils/constants.js';
import { generateSmartQuestion, generateInsights } from '../smartEngage.js';
import { summarizeTimelineWithLocalModel } from '../localRecap.js';
import { fetchRelatedTimeline } from '../newsApi.js';
import JargonText from '../JargonText.jsx';
import { JargonWord } from '../JargonWord.jsx';
import { JARGON_GLOSSARY } from '../glossary.js';
import { CategoryBar, NewsCategoryBar } from './CategoryBar.jsx';

export function StoryCard({story,onOpen,isFollowing,isRead,isBookmarked,onToggleBookmark}
