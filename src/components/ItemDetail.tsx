import type { ReactNode } from 'react'
import {
  getPrerequisiteStatusColor,
  getPrerequisiteStatusLabel,
} from '../lib/prerequisites.ts'
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
