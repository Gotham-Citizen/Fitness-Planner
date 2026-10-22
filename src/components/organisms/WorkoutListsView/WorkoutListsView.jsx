import { useState } from "react"

import { useTranslation } from "react-i18next"

import { exerciseName, mediaUrl } from "../../../lib/muscles.js"

import "./WorkoutListsView.css"

import { Button, TextInput } from "../../atoms/index.js"


export const WorkoutListsView = ({ workoutLists, onRemoveList, onOpenExercise, onCreateList, onRenameList, onEditWorkout, onStartSession, onHistory, startingSession }) => {
  const { t, i18n } = useTranslation()
  const lang = String(i18n.language || "").toLowerCase().startsWith("zh") ? "zh" : "en"
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [pendingRename, setPendingRename] = useState(null)
  const [renaming, setRenaming] = useState(false)

  const resetCreate = () => {
    setName("")
    setShowCreate(false)
    setPendingRename(null)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    // Backwards compatibility: onCreateList may return a legacy id string.
    const result = await onCreateList(trimmed)
    if (typeof result === "string") {
      resetCreate()
      return
    }
    if (!result || result.status === "created") {
      resetCreate()
      return
    }
    if (result.status === "conflict") {
      setPendingRename({ existing: result.existing, proposed: result.proposed })
      return
    }
    // duplicate / error / empty: App already toasted; keep form open for editing.
  }

  const handleConfirmRename = async () => {
    if (!pendingRename || !onRenameList) return
    try {
      setRenaming(true)
      const updated = await onRenameList(pendingRename.existing.id, pendingRename.proposed)
      if (updated) resetCreate()
      else setPendingRename(null)
    } finally {
      setRenaming(false)
    }
  }

  const handleCancelRename = () => {
    setPendingRename(null)
  }

  return (
    <section className="workouts-view">
      <h2 className="workouts-title">{t("lists.title")}</h2>

      {workoutLists.length === 0 ? (
        <div className="workouts-empty">
          <p>{t("lists.empty")}</p>
        </div>
      ) : (
        <div className="workout-lists">
          {workoutLists.map((list) => (
            <div key={list.id} className="workout-list-card">
              <div className="workout-list-header">
                <div className="workout-list-title">
                  <h3 className="workout-list-name">{list.name}</h3>
                  <span className="workout-list-count">{t("lists.exerciseCount", { count: list.exercises.length })}</span>
                </div>
                <div className="workout-list-actions">
                  <Button
                    variant="ghost"
                    onClick={() => onEditWorkout(list)}
                    aria-label={t("lists.editAria", { name: list.name })}
                  >
                    <span className="wl-full">{t("lists.editWorkout")}</span><span className="wl-short" aria-hidden="true">{t("lists.editShort")}</span>
                  </Button>
                  {list.exercises.length > 0 && (
                    <>
                      <Button
                        onClick={() => onStartSession(list)}
                        disabled={startingSession}
                      >
                        {startingSession ? t("lists.starting") : (<><span className="wl-full">{t("lists.start")}</span><span className="wl-short" aria-hidden="true">{t("lists.startShort")}</span></>)}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => onHistory(list)}
                        aria-label={t("lists.sessionsAria", { name: list.name })}
                      >
                        <span className="wl-full">{t("lists.sessions")}</span><span className="wl-short" aria-hidden="true">{t("lists.sessionsShort")}</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="icon"
                    tone="danger"
                    onClick={() => onRemoveList(list.id)}
                    aria-label={t("lists.deleteAria", { name: list.name })}
                  >
                    ✕
                  </Button>
                </div>
              </div>
              {list.exercises.length === 0 ? (
                <p className="workout-list-empty">{t("lists.noExercises")}</p>
              ) : (
                <ul className="workout-exercise-list">
                  {list.exercises.map((ex) => (
                    <li key={ex.id} className="workout-exercise-row">
                      <button type="button" className="workout-exercise-main" onClick={() => onOpenExercise(ex)}>
                        {mediaUrl(ex.image) ? (
                          <img src={mediaUrl(ex.image)} alt="" loading="lazy" />
                        ) : (
                          <span className="workout-exercise-placeholder" aria-hidden="true">💪</span>
                        )}
                        <span className="workout-exercise-name">{exerciseName(ex, lang)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="workouts-create">
        {showCreate ? (
          <>
            <form className="create-list-form" onSubmit={handleCreate}>
              <TextInput
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("lists.listNamePh")}
                aria-label={t("lists.listNameAria")}
              />
              <Button type="submit" disabled={!name.trim()}>
                {t("lists.create")}
              </Button>
              <Button variant="ghost" onClick={resetCreate}>
                {t("lists.cancel")}
              </Button>
            </form>
            {pendingRename && (
              <div className="rename-confirm" role="alert">
                <p>
                  {t("lists.wantRename", { from: pendingRename.existing.name, to: pendingRename.proposed })}
                </p>
                <div className="rename-confirm-actions">
                  <Button
                    onClick={handleConfirmRename}
                    disabled={renaming}
                  >
                    {renaming ? t("lists.renaming") : t("lists.yesRename")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCancelRename}
                    disabled={renaming}
                  >
                    {t("lists.keepName", { name: pendingRename.existing.name })}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Button variant="secondary" onClick={() => setShowCreate(true)}>
            {t("lists.newList")}
          </Button>
        )}
      </div>
    </section>
  )
}
