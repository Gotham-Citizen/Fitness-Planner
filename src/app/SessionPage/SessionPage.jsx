import { WorkoutSessionView } from "../../components/organisms/index.js"
import { PlannerTemplate } from "../../components/templates/index.js"

/**
 * Active session page. Thin composition.
 * `sidebar` preserves the legacy library rail shown alongside sessions.
 */
export const SessionPage = ({
  banner,
  sidebar,
  list,
  session,
  effortScale,
  timerSound,
  timerVibrate,
  timerFlash,
  invalidSetIds,
  onLogSet,
  onUpdateSet,
  onDeleteSet,
  onFinish,
  onBack,
}) => {
  return (
    <PlannerTemplate
      banner={banner}
      main={(
        <WorkoutSessionView
          list={list}
          session={session}
          effortScale={effortScale}
          timerSound={timerSound}
          timerVibrate={timerVibrate}
          timerFlash={timerFlash}
          onLogSet={onLogSet}
          onUpdateSet={onUpdateSet}
          onDeleteSet={onDeleteSet}
          onFinish={onFinish}
          onBack={onBack}
          invalidSetIds={invalidSetIds}
        />
      )}
      sidebar={sidebar}
    />
  )
}
