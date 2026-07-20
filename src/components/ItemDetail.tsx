import type { ReactNode } from 'react'
import {
  getPrerequisiteStatusColor,
  getPrerequisiteStatusLabel,
} from '../lib/prerequisites.ts'
import {
  formatH2HAffinityRequirement,
} from '../lib/h2h-availability.ts'
import type { ItemWithStatus } from '../types/tracker.ts'

interface ItemDetailProps {
  item: ItemWithStatus | null
  onClose: () => void
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

export function ItemDetail({ item, onClose }: ItemDetailProps) {
  if (!item) return null

  return (
    <aside className="item-detail">
      <div className="item-detail-header">
        <h2>{item.name}</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="item-detail-meta">
        {item.region && <span className="meta-tag">{item.region}</span>}
        {item.level !== undefined && (
          <span className="meta-tag">Lv. {item.level}</span>
        )}
        {item.collectType && (
          <span className="meta-tag">{item.collectType}</span>
        )}
        {item.rarity && <span className="meta-tag">{item.rarity}</span>}
        <span
          className="meta-tag status-tag"
          style={{
            backgroundColor: getPrerequisiteStatusColor(item.prerequisiteStatus),
          }}
        >
          {getPrerequisiteStatusLabel(item.prerequisiteStatus)}
        </span>
      </div>

      {item.category === 'achievement' && item.description && (
        <DetailSection title="Requirement">
          <p>{item.description}</p>
        </DetailSection>
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

          {item.walkthrough && (
            <DetailSection title="Walkthrough">
              <pre className="walkthrough-text">{item.walkthrough}</pre>
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

          {item.results && (
            <DetailSection title="Results">
              <pre className="walkthrough-text">{item.results}</pre>
            </DetailSection>
          )}

          {item.uniqueComments && (
            <DetailSection title="Unique Comments">
              <pre className="walkthrough-text">{item.uniqueComments}</pre>
            </DetailSection>
          )}

          {item.trivia && (
            <DetailSection title="Trivia">
              <p>{item.trivia}</p>
            </DetailSection>
          )}
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
              <p>{item.itemGifting}</p>
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
              <p>{formatH2HAffinityRequirement(item.affinityLevel)}</p>
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
          {item.description && item.category !== 'achievement' && (
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

          {item.walkthrough && (
            <DetailSection title="Walkthrough">
              <pre className="walkthrough-text">{item.walkthrough}</pre>
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

          {item.uniqueComments && (
            <DetailSection title="Unique Comments">
              <pre className="walkthrough-text">{item.uniqueComments}</pre>
            </DetailSection>
          )}

          {item.results && (
            <DetailSection title="Results">
              <pre className="walkthrough-text">{item.results}</pre>
            </DetailSection>
          )}

          {item.trivia && (
            <DetailSection title="Trivia">
              <p>{item.trivia}</p>
            </DetailSection>
          )}
        </>
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
