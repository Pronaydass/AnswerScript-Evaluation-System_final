import { Box, Typography, LinearProgress, Paper, Chip, Stack } from '@mui/material'
import { CheckCircle, RadioButtonUnchecked, PendingActions } from '@mui/icons-material'

const PROCESSING_STEPS = [
  { id: 'qp_uploaded', label: 'Question Paper Uploaded' },
  { id: 'model_uploaded', label: 'Model Answer Uploaded' },
  { id: 'script_uploaded', label: 'Student Script Uploaded' },
  { id: 'extracting', label: 'Extracting Text' },
  { id: 'cleaning', label: 'Cleaning Text' },
  { id: 'segmentation', label: 'Question Segmentation' },
  { id: 'rubric', label: 'Dynamic Rubric Generation' },
  { id: 'evaluation', label: 'Semantic Evaluation' },
  { id: 'scoring', label: 'Score Calculation' },
  { id: 'feedback', label: 'Feedback Generation' }
]

export default function EvaluationProgress({ progress, status }) {
  // Backend থেকে আসা progress দিয়ে কোন Step Active বের করো
  const getActiveStepIndex = () => {
    if (progress <= 10) return 0
    if (progress <= 20) return 1
    if (progress <= 30) return 2
    if (progress <= 40) return 3
    if (progress <= 50) return 4
    if (progress <= 60) return 5
    if (progress <= 70) return 6
    if (progress <= 80) return 7
    if (progress <= 90) return 8
    return 9
  }

  const activeIndex = getActiveStepIndex()

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        border: '1px solid #e2e8f0',
        bgcolor: 'background.paper',
        borderRadius: 2
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
               AI Answer Script Evaluation
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Evaluation in Progress...
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Overall Progress
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#e2e8f0',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
                borderRadius: 5
              }
            }}
          />
        </Box>

        <Chip
          icon={<PendingActions sx={{ fontSize: 16 }} />}
          label={status || 'Starting...'}
          size="medium"
          sx={{
            alignSelf: 'flex-start',
            bgcolor: '#eff6ff',
            color: 'primary.dark',
            border: '1px solid #bfdbfe',
            fontWeight: 600,
            height: 32
          }}
        />

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
            Current Status
          </Typography>
          <Stack spacing={1.5}>
            {PROCESSING_STEPS.map((step, index) => {
              const isCompleted = index < activeIndex
              const isActive = index === activeIndex
              const isPending = index > activeIndex

              return (
                <Box
                  key={step.id}
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: isActive ? 'primary.main' : isCompleted ? '#d1fae5' : '#e2e8f0',
                    bgcolor: isActive ? '#eff6ff' : isCompleted ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {isCompleted ? (
                      <CheckCircle sx={{ color: 'success.main', fontSize: 22 }} />
                    ) : isActive ? (
                      <PendingActions sx={{ color: 'primary.main', fontSize: 22 }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ color: '#cbd5e1', fontSize: 22 }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'primary.dark' : isCompleted ? 'success.dark' : 'text.secondary',
                        flex: 1
                      }}
                    >
                      {step.label}
                    </Typography>
                    {isCompleted && (
                      <Chip
                        label="Done"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: '#d1fae5',
                          color: 'success.dark',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}