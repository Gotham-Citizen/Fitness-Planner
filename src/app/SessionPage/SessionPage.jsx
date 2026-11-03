import { WorkoutSessionView } from "../../components/organisms/index.js"
import { PlannerTemplate } from "../../components/templates/index.js"

import "./SessionPage.css"

export const SessionPage = ({ banner, list, session, effortScale, timerSound, timerVibrate, timerFlash, invalidSetIds, onLogSet, onUpdateSet, onDeleteSet, onFinish, onBack }) => (
  <PlannerTemplate
    banner={banner}
    main={
      <WorkoutSessionView
        list={list}
        session={session}
        effortScale={effortScale}
        timerSound={timerSound}
        timerVibrate={timerVibrate}
        timerFlash={timerFlash}
        invalidSetIds={invalidSetIds}
        onLogSet={onLogSet}
        onUpdateSet={onUpdateSet}
        onDeleteSet={onDeleteSet}
        onFinish={onFinish}
        onBack={onBack}
      />
    }
  />
)