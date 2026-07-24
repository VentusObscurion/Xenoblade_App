import type { ReactNode } from 'react'
import {
  AFFINITY_COLOR_HEX,
  parseGiftingEntries,
} from '../lib/format-display.ts'
import { formatH2HAffinityShort } from '../lib/h2h-availability.ts'
import {
  getPrerequisiteStatusColor,
  getPrerequisiteStatusLabel,
} from '../lib/prerequisites.ts'
import type { ItemWithStatus } from '../types/tracker.ts'

interface ItemDetailProps {
  item: ItemWithStatus | null
  onClose: () => void
  notes?: string
  onNotesChange?: (itemId: string, notes: string) => void
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function BulletList({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <ul className="detail-bullets">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  )
}

function GiftingTable({ gifting }: { gifting: string }) {
  const entries = parseGiftingEntries(gifting)
  if (entries.length === 0) return <p>{gifting}</p>
  return (
    <table className="gifting-table">
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.character}>
            <td>{entry.character}</td>
            <td className="gifting-value">{entry.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ItemDetail({
  item,
  onClose,
  notes = '',
  onNotesChange,
}: ItemDetailProps) {
  if (!item) return null

  const walkthroughLines = item.walkthrough
    ? item.walkthrough.split('\n').filter(Boolean)
    : []
  const resultsLines = item.results ? item.results.split('\n').filter(Boolean) : []
  const uniqueCommentLines = item.uniqueComments
    ? item.uniqueComments.split('\n').filter(Boolean)
    : []

  return (
    <aside className="item-detail">
      <div className="item-detail-header">
        <h2>{item.name}</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {item.imageUrl && (
        <div className="item-detail-image-wrap">
          <img
            className="item-detail-image"
            src={item.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <div className="item-detail-meta">
        {item.region && <span className="meta-tag">{item.region}</span>}
        {item.level !== undefined && (
          <span className="meta-tag">Lv. {item.level}</span>
        )}
        {item.collectType && (
          <span className="meta-tag">{item.collectType}</span>
        )}
        {item.rarity && <span className="meta-tag">{item.rarity}</span>}
        {item.timed && (
          <span
            className="meta-tag timed-tag"
            title="This quest can become unavailable after story progress"
          >
            Timed
          </span>
        )}
        <span
          className="meta-tag status-tag"
          style={{
            backgroundColor: getPrerequisiteStatusColor(item.prerequisiteStatus),
          }}
        >
          {getPrerequisiteStatusLabel(item.prerequisiteStatus)}
        </span>
      </div>

      {item.timed && item.category === 'quest' && (
        <p className="timed-warning">
          Story-timed quest — complete it before later story progress makes it
          unavailable.
        </p>
      )}

      {item.category === 'quest' ? (
        <>
          {item.subLocation && (
            <DetailSection title="Location">
              <p>{item.subLocation}</p>
            </DetailSection>
          )}

          {item.prerequisites.length > 0 && (
            <DetailSection title="Prerequisites">
              <ul className="prereq-list">
                {item.prerequisites.map((prereq, i) => (
                  <li key={i} className={`prereq-type-${prereq.type}`}>
                    <span className="prereq-type">{prereq.type}</span>
                    {prereq.label}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {item.timeWindow && (
            <DetailSection title="Time Window">
              <p>{item.timeWindow}</p>
            </DetailSection>
          )}

          {item.giver && (
            <DetailSection title="Quest Giver">
              <p>{item.giver}</p>
            </DetailSection>
          )}

          {walkthroughLines.length > 0 && (
            <DetailSection title="Walkthrough">
              <BulletList lines={walkthroughLines} />
            </DetailSection>
          )}

          {item.rewards && item.rewards.length > 0 && (
            <DetailSection title="Rewards">
              <ul>
                {item.rewards.map((reward, i) => (
                  <li key={i}>{reward}</li>
                ))}
              </ul>
            </DetailSection>
          )}

          {item.description && (
            <DetailSection title="Description">
              <p>{item.description}</p>
            </DetailSection>
          )}

          {resultsLines.length > 0 && (
            <DetailSection title="Results">
              <BulletList lines={resultsLines} />
            </DetailSection>
          )}

          {uniqueCommentLines.length > 0 && (
            <DetailSection title="Unique Comments">
              <BulletList lines={uniqueCommentLines} />
            </DetailSection>
          )}

          {item.trivia && (
            <DetailSection title="Trivia">
              <p>{item.trivia}</p>
            </DetailSection>
          )}
        </>
      ) : item.category === 'person' ? (
        <>
          {item.region && (
            <DetailSection title="Location">
              <p>{item.region}</p>
            </DetailSection>
          )}
          {item.timeWindow && (
            <DetailSection title="Active Time">
              <p>{item.timeWindow}</p>
            </DetailSection>
          )}
          {item.description && (
            <DetailSection title="Details">
              <p>{item.description}</p>
            </DetailSection>
          )}
          <DetailSection title="Affinity Chart">
            <p>
              Check the box when this NPC is registered on your Affinity Chart.
            </p>
          </DetailSection>
        </>
      ) : item.category === 'item' ? (
        <>
          {item.description && (
            <DetailSection title="Description">
              <p>{item.description}</p>
            </DetailSection>
          )}

          {item.itemLocations && item.itemLocations.length > 0 && (
            <DetailSection title="Location">
              <p>{item.itemLocations.join(', ')}</p>
            </DetailSection>
          )}

          {item.itemHasTrade && (
            <DetailSection title="Trade">
              {item.itemTradeInfo && item.itemTradeInfo.length > 0 ? (
                <ul>
                  {item.itemTradeInfo.map((entry, i) => (
                    <li key={i}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <p>Available via NPC trade</p>
              )}
            </DetailSection>
          )}

          {item.itemGifting && (
            <DetailSection title="Gifting">
              <GiftingTable gifting={item.itemGifting} />
            </DetailSection>
          )}

          {item.itemQuestUses && item.itemQuestUses.length > 0 && (
            <DetailSection title="Quests">
              <ul>
                {item.itemQuestUses.map((quest, i) => (
                  <li key={i}>{quest}</li>
                ))}
              </ul>
            </DetailSection>
          )}
        </>
      ) : item.category === 'heart_to_heart' ? (
        <>
          {(item.region || item.subLocation) && (
            <DetailSection title="Location">
              <p>
                {item.region}
                {item.region && item.subLocation ? ' — ' : ''}
                {item.subLocation}
              </p>
            </DetailSection>
          )}

          {item.characters && item.characters.length > 0 && (
            <DetailSection title="Characters">
              <p>{item.characters.join(' & ')}</p>
            </DetailSection>
          )}

          {item.affinityLevel !== undefined && item.affinityLevel > 0 && (
            <DetailSection title="Affinity Required">
              <p
                className="h2h-affinity-label"
                style={{ color: AFFINITY_COLOR_HEX[item.affinityLevel] }}
              >
                {formatH2HAffinityShort(item.affinityLevel)}
              </p>
            </DetailSection>
          )}

          {item.timeOfDay && (
            <DetailSection title="Time">
              <p>{item.timeOfDay}</p>
            </DetailSection>
          )}

          {item.h2hIntro && (
            <DetailSection title="Introduction">
              <pre className="walkthrough-text">{item.h2hIntro}</pre>
            </DetailSection>
          )}

          {item.prerequisites.length > 0 && (
            <DetailSection title="Requirements">
              <ul className="prereq-list">
                {item.prerequisites.map((prereq, i) => (
                  <li key={i} className={`prereq-type-${prereq.type}`}>
                    <span className="prereq-type">{prereq.type}</span>
                    {prereq.label}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {item.affinityEffects && (
            <DetailSection title="Affinity Effects">
              <p>{item.affinityEffects}</p>
            </DetailSection>
          )}

          {item.h2hOutcomes && item.h2hOutcomes.length > 0 && (
            <DetailSection title="Answers & Outcomes">
              <div className="h2h-outcomes">
                {item.h2hOutcomes.map((outcome, index) => (
                  <div key={`${outcome.title}-${index}`} className="h2h-outcome">
                    <h4>{outcome.title}</h4>
                    {outcome.choices.length > 0 && (
                      <p className="h2h-choices">
                        <strong>Choices:</strong> {outcome.choices.join(' -> ')}
                      </p>
                    )}
                    <pre className="walkthrough-text">{outcome.dialogue}</pre>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
        </>
      ) : (
        <>
          {item.description && (
            <DetailSection title="Description">
              <p>{item.description}</p>
            </DetailSection>
          )}

          {item.giver && (
            <DetailSection title="Quest Giver">
              <p>{item.giver}</p>
            </DetailSection>
          )}

          {item.subLocation && (
            <DetailSection title="Location">
              <p>{item.subLocation}</p>
            </DetailSection>
          )}

          {item.timeWindow && (
            <DetailSection title="Time Window">
              <p>{item.timeWindow}</p>
            </DetailSection>
          )}

          {item.questType && (
            <DetailSection title="Quest Type">
              <p>{item.questType}</p>
            </DetailSection>
          )}

          {item.characters && item.characters.length > 0 && (
            <DetailSection title="Characters">
              <ul>
                {item.characters.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </DetailSection>
          )}

          {item.spawnTime && (
            <DetailSection title="Spawn Time">
              <p>{item.spawnTime}</p>
            </DetailSection>
          )}

          {item.respawn && (
            <DetailSection title="Respawn">
              <p>{item.respawn}</p>
            </DetailSection>
          )}

          {(item.expReward || item.apReward) && (
            <DetailSection title="Rewards (on defeat)">
              <p>
                {item.expReward ? `${item.expReward} EXP` : ''}
                {item.expReward && item.apReward ? ' · ' : ''}
                {item.apReward ? `${item.apReward} AP` : ''}
              </p>
            </DetailSection>
          )}

          {walkthroughLines.length > 0 && (
            <DetailSection title="Walkthrough">
              <BulletList lines={walkthroughLines} />
            </DetailSection>
          )}

          {item.prerequisites.length > 0 && (
            <DetailSection title="Prerequisites">
              <ul className="prereq-list">
                {item.prerequisites.map((prereq, i) => (
                  <li key={i} className={`prereq-type-${prereq.type}`}>
                    <span className="prereq-type">{prereq.type}</span>
                    {prereq.label}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {item.rewards && item.rewards.length > 0 && (
            <DetailSection title="Rewards">
              <ul>
                {item.rewards.map((reward, i) => (
                  <li key={i}>{reward}</li>
                ))}
              </ul>
            </DetailSection>
          )}

          {item.drops && item.drops.length > 0 && (
            <DetailSection title="Drops">
              <ul>
                {item.drops.map((drop, i) => (
                  <li key={i}>{drop}</li>
                ))}
              </ul>
            </DetailSection>
          )}

          {uniqueCommentLines.length > 0 && (
            <DetailSection title="Unique Comments">
              <BulletList lines={uniqueCommentLines} />
            </DetailSection>
          )}

          {resultsLines.length > 0 && (
            <DetailSection title="Results">
              <BulletList lines={resultsLines} />
            </DetailSection>
          )}

          {item.trivia && (
            <DetailSection title="Trivia">
              <p>{item.trivia}</p>
            </DetailSection>
          )}
        </>
      )}

      {onNotesChange && (
        <DetailSection title="Notes">
          <textarea
            className="item-notes"
            value={notes}
            placeholder="Personal notes…"
            rows={3}
            onChange={(e) => onNotesChange(item.id, e.target.value)}
          />
        </DetailSection>
      )}

      <a
        href={item.wikiUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="wiki-link"
      >
        View on Wiki →
      </a>
    </aside>
  )
}
