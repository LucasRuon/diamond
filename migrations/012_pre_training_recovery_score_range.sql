-- Migration 012: alterar escala de recovery_score do questionário pré-treino
-- De 6-20 para 1-10.

ALTER TABLE pre_training_questionnaires
  DROP CONSTRAINT IF EXISTS pre_training_questionnaires_recovery_score_check;

ALTER TABLE pre_training_questionnaires
  ADD CONSTRAINT pre_training_questionnaires_recovery_score_check
  CHECK (recovery_score BETWEEN 1 AND 10) NOT VALID;
