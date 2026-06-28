import React, { useState, useEffect } from 'react';

import { CARD_SUITS, CARD_RANKS } from '../../constants';
import { CardSelectionPopupProps } from '../../types';

import styles from './CardSelectionPopup.module.css';

const CardSelectionPopup: React.FC<CardSelectionPopupProps> = ({ isOpen, onClose, onCardSelect, currentCardData }) => {
  const [selectedSuit, setSelectedSuit] = useState<string>('');
  const [selectedRank, setSelectedRank] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<string>('player');

  useEffect(() => {
    if (currentCardData && currentCardData.sc) {
      const sc = currentCardData.sc;
      const match = sc.match(/^(\d+|[AJQK])([HDCS])(\d+)$/);
      if (match) {
        const [, rank, suit] = match;
        setSelectedRank(rank);
        setSelectedSuit(suit);
      }
    }
    if (currentCardData && currentCardData.place) {
      setSelectedPlace(currentCardData.place);
    }
  }, [currentCardData]);

  const handleConfirm = () => {
    if (selectedSuit && selectedRank) {
      const rankData = CARD_RANKS.find((r) => r.symbol === selectedRank);
      const cardCount = String(rankData?.cardValue) || '0';
      const sc = `${selectedRank}${selectedSuit}${cardCount}`;

      onCardSelect({
        sc,
        place: selectedPlace,
        cardCount,
      });
      onClose();
    }
  };

  const handleReset = () => {
    setSelectedSuit('');
    setSelectedRank('');
    setSelectedPlace('player');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.cardPopupOverlay}>
      <div className={styles.cardPopupContent}>
        <div className={styles.cardPopupHeader}>
          <h2 className={styles.cardPopupTitle}>🃏 Select Playing Card</h2>
          <button className={styles.cardPopupClose} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Player Position Section */}
        <div className={styles.cardSection}>
          <h3 className={styles.cardSectionTitle}>Player Position:</h3>
          <div className={styles.placeButtons}>
            {['player', 'banker'].map((place) => (
              <button
                key={place}
                onClick={() => setSelectedPlace(place)}
                className={`${styles.placeButton} ${selectedPlace === place ? styles.selected : ''}`}
              >
                {place.charAt(0).toUpperCase() + place.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Suit Selection Section */}
        <div className={styles.cardSection}>
          <h3 className={styles.cardSectionTitle}>Select Suit:</h3>
          <div className={styles.suitGrid}>
            {CARD_SUITS.map((suit) => (
              <button
                key={suit.initial}
                onClick={() => setSelectedSuit(suit.initial)}
                className={`${styles.suitButton} ${selectedSuit === suit.initial ? styles.selected : ''}`}
                style={{ color: suit.color }}
              >
                <div className={styles.suitSymbol}>{suit.symbol}</div>
                <div className={styles.suitName}>{suit.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Rank Selection Section */}
        <div className={styles.cardSection}>
          <h3 className={styles.cardSectionTitle}>Select Rank:</h3>
          <div className={styles.rankGrid}>
            {CARD_RANKS.map((rank) => (
              <button
                key={rank.symbol}
                onClick={() => setSelectedRank(rank.symbol)}
                className={`${styles.rankButton} ${selectedRank === rank.symbol ? styles.selected : ''}`}
              >
                <div className={styles.rankSymbol}>{rank.symbol}</div>
                <div className={styles.rankName}>{rank.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card Preview Section */}
        {selectedSuit && selectedRank && (
          <div className={styles.cardPreview}>
            <h3 className={styles.cardSectionTitle}>Preview:</h3>
            <div className={styles.previewCard}>
              <div
                className={styles.previewCardContent}
                style={{ color: CARD_SUITS.find((s) => s.initial === selectedSuit)?.color }}
              >
                <div className={styles.previewRank}>{selectedRank}</div>
                <div className={styles.previewSuit}>{CARD_SUITS.find((s) => s.initial === selectedSuit)?.symbol}</div>
              </div>
              <div className={styles.previewInfo}>
                <div className={styles.previewDetail}>
                  Place: <strong>{selectedPlace}</strong>
                </div>
                <div className={styles.previewDetail}>
                  Card Value: <strong>{CARD_RANKS.find((r) => r.symbol === selectedRank)?.cardValue || 0}</strong>
                </div>
                <div className={styles.previewDetail}>
                  SC Format:{' '}
                  <strong>
                    {selectedRank}
                    {selectedSuit}
                    {CARD_RANKS.find((r) => r.symbol === selectedRank)?.cardValue || 0}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.cardPopupActions}>
          <button className={`${styles.cardActionButton} ${styles.resetButton}`} onClick={handleReset}>
            🔄 Reset
          </button>
          <button className={`${styles.cardActionButton} ${styles.cancelButton}`} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`${styles.cardActionButton} ${styles.confirmButton}`}
            onClick={handleConfirm}
            disabled={!selectedSuit || !selectedRank}
          >
            ✅ Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardSelectionPopup;
