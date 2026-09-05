import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Heart,
  Eye,
  EyeOff,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, Review } from '../types';
import { fetchReviews, postReview } from '../services/movieApi';

interface ReviewsSectionProps {
  movie: Movie;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ movie }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<Record<string, { helpful: number; loved: boolean; helpfulActive?: boolean }>>({});
  
  // Write review form state
  const [isWriting, setIsWriting] = useState(false);
  const [userRating, setUserRating] = useState<number>(9);
  const [authorName, setAuthorName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [filterSource, setFilterSource] = useState<'All' | 'Jikan' | 'TMDB' | 'Community'>('All');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const isAnime =
      movie.mediaType === 'anime' ||
      Boolean(movie.malId) ||
      Boolean(movie.anilistId) ||
      movie.genres.includes('Animation') ||
      Boolean(movie.japaneseTitle);

    fetchReviews(movie.id, {
      malId: movie.malId,
      tmdbId: movie.tmdbId,
      isAnime,
    }).then((data) => {
      if (isMounted) {
        setReviews(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [movie.id, movie.malId, movie.tmdbId, movie.mediaType, movie.genres, movie.japaneseTitle, movie.anilistId]);

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleHelpful = (id: string) => {
    setReactions((prev) => {
      const current = prev[id] || { helpful: 0, loved: false, helpfulActive: false };
      const newActive = !current.helpfulActive;
      return {
        ...prev,
        [id]: {
          ...current,
          helpfulActive: newActive,
          helpful: current.helpful + (newActive ? 1 : -1),
        },
      };
    });
  };

  const handleLove = (id: string) => {
    setReactions((prev) => {
      const current = prev[id] || { helpful: 0, loved: false };
      return {
        ...prev,
        [id]: {
          ...current,
          loved: !current.loved,
        },
      };
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    setSubmitting(true);
    const created = await postReview(movie.id, {
      author: authorName.trim() || 'Refra Cinephile',
      rating: userRating,
      content: reviewText.trim(),
      isSpoiler,
      tags: userRating >= 9 ? ['Masterpiece', 'Refra Pro'] : ['Verified Watcher'],
    });

    setSubmitting(false);
    if (created) {
      setReviews((prev) => [created, ...prev]);
      setReviewText('');
      setIsWriting(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterSource === 'All') return true;
    if (filterSource === 'Jikan') return r.source.includes('Jikan') || r.source.includes('MyAnimeList');
    if (filterSource === 'TMDB') return r.source.includes('TMDB');
    if (filterSource === 'Community') return r.source.includes('Refra') || r.source.includes('Luma') || r.source.includes('AniList');
    return true;
  });

  const avgScore = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 8), 0) / reviews.length).toFixed(1)
    : movie.score;

  return (
    <div className="space-y-4 pt-2">
      {/* Reviews Summary Header Card */}
      <div className="p-4 rounded-3xl bg-[#151720] border border-white/5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col items-center justify-center shadow-inner">
              <div className="flex items-center text-sm font-bold text-white">
                <Star className="w-3.5 h-3.5 fill-white text-white mr-0.5" />
                {avgScore}
              </div>
              <span className="text-[9px] text-neutral-400">/ 10</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Audience & Critic Reviews</h4>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Jikan API
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {reviews.length} Verified Opinions • MyAnimeList & TMDB Sync
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setIsWriting(!isWriting)}
            className="px-3.5 py-2 rounded-2xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isWriting ? 'Cancel' : 'Write Review'}</span>
          </motion.button>
        </div>

        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Your review was published to the cinephile index.</span>
          </motion.div>
        )}
      </div>

      {/* Write Review Form Expandable */}
      <AnimatePresence>
        {isWriting && (
          <motion.form
            initial={{ opacity: 0, scaleY: 0.96, y: -6 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.96, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top', willChange: 'transform, opacity' }}
            onSubmit={handleSubmitReview}
            className="p-4 rounded-3xl bg-[#181b26] border border-white/10 space-y-3.5 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
                Post Your Critique
              </span>
              <span className="text-[11px] text-neutral-400">Score: {userRating}/10</span>
            </div>

            {/* Rating Selector */}
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setUserRating(num)}
                  className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center justify-center ${
                    userRating === num
                      ? 'bg-white text-neutral-950 shadow-md scale-105'
                      : 'bg-[#222736] text-neutral-400 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your Nickname / Cinephile Handle (Optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12141c] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
              />

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your analysis on cinematography, pacing, voice acting, soundtrack, or themes..."
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12141c] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-neutral-200 focus:ring-0"
                />
                <span>Contains Spoilers</span>
              </label>

              <button
                type="submit"
                disabled={submitting || !reviewText.trim()}
                className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 disabled:opacity-40 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? 'Publishing...' : 'Publish'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Source Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        {(['All', 'Jikan', 'TMDB', 'Community'] as const).map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => setFilterSource(source)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              filterSource === source
                ? 'bg-neutral-200 text-neutral-950 font-semibold'
                : 'bg-[#181a24] text-neutral-400 hover:text-white'
            }`}
          >
            {source === 'Jikan'
              ? 'MyAnimeList / Jikan'
              : source === 'TMDB'
              ? 'TMDB Critics'
              : source === 'Community'
              ? 'Refra Members'
              : 'All Reviews'}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 rounded-3xl bg-[#14161f] border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs text-neutral-400">Fetching reviews from Jikan v4 REST API & TMDB...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#14161f] border border-white/5 text-center space-y-1">
            <MessageSquare className="w-8 h-8 text-neutral-500 mx-auto opacity-60" />
            <h5 className="text-xs font-semibold text-white">No Reviews in this Category</h5>
            <p className="text-[11px] text-neutral-400">Be the first cinephile to share your thoughts!</p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const isRevealed = revealedSpoilers[rev.id];
            const reactionData = reactions[rev.id] || {
              helpful: rev.reactions?.helpful || 8,
              loved: false,
              helpfulActive: false,
            };

            return (
              <motion.div
                key={rev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-3xl bg-[#14161f] border border-white/5 space-y-3 shadow-lg"
              >
                {/* Author row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {rev.authorAvatar ? (
                      <img
                        src={rev.authorAvatar}
                        alt={rev.author}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#242938] text-white text-xs font-bold flex items-center justify-center border border-white/10 shrink-0">
                        {rev.author.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white">{rev.author}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#1e222e] text-neutral-300 font-medium border border-white/5">
                          {rev.source}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{rev.date}</span>
                    </div>
                  </div>

                  {/* Rating Pill */}
                  <div className="flex items-center gap-1 bg-[#1e2330] px-2.5 py-1 rounded-xl border border-white/5 shrink-0">
                    <Star className="w-3 h-3 fill-white text-white" />
                    <span className="text-xs font-bold text-white">{rev.score || `${rev.rating}/10`}</span>
                  </div>
                </div>

                {/* Tags */}
                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {rev.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#191d28] text-neutral-300 border border-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Review Text */}
                <div className="relative">
                  {rev.isSpoiler && !isRevealed ? (
                    <div className="p-3 rounded-2xl bg-[#1b1e2a] border border-amber-500/20 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>This review contains narrative spoilers</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSpoiler(rev.id)}
                        className="px-3 py-1 rounded-xl bg-neutral-200 hover:bg-white text-neutral-950 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Reveal Review</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-neutral-300 leading-relaxed font-light whitespace-pre-line">
                        {rev.content}
                      </p>
                      {rev.isSpoiler && isRevealed && (
                        <button
                          type="button"
                          onClick={() => toggleSpoiler(rev.id)}
                          className="mt-2 text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Hide Spoilers</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Interaction Footer (Helpful / Love reactions) */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleHelpful(rev.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                        reactionData.helpfulActive
                          ? 'bg-neutral-200 text-neutral-950 font-semibold'
                          : 'bg-[#1b1e2a] hover:bg-[#252a3a] text-neutral-300'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{reactionData.helpful} Helpful</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLove(rev.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                        reactionData.loved
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                          : 'bg-[#1b1e2a] hover:bg-[#252a3a] text-neutral-300'
                      }`}
                    >
                      <Heart
                        className={`w-3 h-3 ${
                          reactionData.loved ? 'fill-rose-400 text-rose-400' : 'text-neutral-400'
                        }`}
                      />
                      <span>Love</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-neutral-500" />
                    Verified
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
