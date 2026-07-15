import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Box, Container, Typography, Paper, Stack, Button, CardContent, Chip, Grid,
  Tabs, Tab, TextField, InputAdornment, IconButton, Tooltip, Avatar, LinearProgress, Card,
  Dialog, DialogContent
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import VisibilityIcon from '@mui/icons-material/Visibility'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AssessmentIcon from '@mui/icons-material/Assessment'
import HomeIcon from '@mui/icons-material/Home'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SearchIcon from '@mui/icons-material/Search'
import SchoolIcon from '@mui/icons-material/School'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import CloseIcon from '@mui/icons-material/Close'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import DoneIcon from '@mui/icons-material/Done'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

const API = 'http://localhost:8000'

export default function EvaluatedScriptsView() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [subjects, setSubjects] = useState([])
  const [openPDF, setOpenPDF] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [resultDetails, setResultDetails] = useState(null) // ✅ Add
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgKey, setImgKey] = useState(0)
  const imgRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/results`)
      const filtered = res.data.filter(r => r.roll_no!== 'NOT_FOUND' && r.roll_no!== 'ERROR')
      setResults(filtered)
      const uniqueSubjects = [...new Set(filtered.map(r => r.subject_name || 'Unknown'))]
      setSubjects(['All Subjects',...uniqueSubjects])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Fetch full details with markings + feedback
  const handleViewPDF = async (result) => {
    setOpenPDF(result)
    setCurrentPage(0)
    setImgLoaded(false)
    setImgKey(prev => prev + 1)
    try {
      const res = await axios.get(`${API}/result/${result.roll_no}?subject_name=${encodeURIComponent(result.subject_name)}`)
      setResultDetails(res.data)
    } catch (e) {
      console.error('Failed to fetch markings:', e)
    }
  }
const handleDelete = async (roll, subjectName, e) => {
  e.stopPropagation()
  if (!confirm(`Delete result for Roll: ${roll} - ${subjectName}?`)) return
  try {
    await axios.delete(`${API}/result/${roll}?subject_name=${encodeURIComponent(subjectName)}`)
    fetchResults()
  } catch (err) {
    console.error(err)
    alert('Delete failed: ' + err.response?.data?.error || err.message)
  }
}
  const getGrade = (percent) => {
    if (percent >= 80) return { label: 'Excellent', color: '#059669', bg: '#d1fae5' }
    if (percent >= 60) return { label: 'Good', color: '#1e3a8a', bg: '#dbeafe' }
    if (percent >= 40) return { label: 'Average', color: '#d97706', bg: '#fed7aa' }
    return { label: 'Poor', color: '#dc2626', bg: '#fee2e2' }
  }

  const filteredResults = results.filter(r => {
    const subjectMatch = selectedSubject === 0 || r.subject_name === subjects[selectedSubject]
    const searchMatch =!searchQuery ||
      r.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    return subjectMatch && searchMatch
  })

  const handleImageLoad = () => setImgLoaded(true)

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    setImgLoaded(false)
    setImgKey(prev => prev + 1)
  }

  const renderMarkings = () => {
    if (!resultDetails?.markings ||!imgRefs.current[currentPage] ||!imgLoaded) return null
    const img = imgRefs.current[currentPage]
    if (!img ||!img.naturalWidth) return null
    const natW = img.naturalWidth
    const natH = img.naturalHeight

    return (
      <>
        {resultDetails.markings.green?.filter(m => m.page === currentPage).map((m, i) => (
          <Box key={`green-${i}`} sx={{ position: 'absolute', left: `${(m.x / natW) * 100}%`, top: `${(m.y / natH) * 100}%`, width: `${(m.width / natW) * 100}%`, height: `${Math.max(m.height, 3)}px`, background: 'linear-gradient(90deg, #00C853 0%, #00E676 100%)', pointerEvents: 'none', zIndex: 10, borderRadius: 0.5, boxShadow: '0 0 8px rgba(0,200,83,0.8)' }} />
        ))}
        {resultDetails.markings.red?.filter(m => m.page === currentPage).map((m, i) => (
          <Box key={`red-${i}`} sx={{ position: 'absolute', left: `${(m.x / natW) * 100}%`, top: `${(m.y / natH) * 100}%`, width: `${(m.width / natW) * 100}%`, height: `${Math.max(m.height, 3)}px`, background: 'linear-gradient(90deg, #D50000 0%, #FF1744 100%)', pointerEvents: 'none', zIndex: 10, borderRadius: 0.5, boxShadow: '0 0 8px rgba(213,0,0,0.8)' }} />
        ))}
        {resultDetails.markings.ticks?.filter(t => t.page === currentPage).map((t, i) => (
          <DoneIcon key={`tick-${i}`} sx={{ position: 'absolute', left: `${(t.x / natW) * 100}%`, top: `${(t.y / natH) * 100}%`, color: '#00C853', fontSize: t.size || 32, fontWeight: 900, zIndex: 11, filter: 'drop-shadow(0 2px 6px rgba(0,200,83,1))' }} />
        ))}
        {resultDetails.markings.crosses?.filter(c => c.page === currentPage).map((c, i) => (
          <CloseRoundedIcon key={`cross-${i}`} sx={{ position: 'absolute', left: `${(c.x / natW) * 100}%`, top: `${(c.y / natH) * 100}%`, color: '#D50000', fontSize: c.size || 32, fontWeight: 900, zIndex: 11, filter: 'drop-shadow(0 2px 6px rgba(213,0,0,1))' }} />
        ))}
        {resultDetails.markings.boxes?.filter(b => b.page === currentPage).map((b, i) => (
          <Box key={`box-${i}`} sx={{ position: 'absolute', left: `${(b.x / natW) * 100}%`, top: `${(b.y / natH) * 100}%`, width: `${(b.width / natW) * 100}%`, height: `${(b.height / natH) * 100}%`, border: `${b.stroke || 4}px solid ${b.color}`, borderRadius: 2, pointerEvents: 'none', zIndex: 9, boxShadow: `0 0 16px ${b.color}99, inset 0 0 12px ${b.color}4D`, backgroundColor: b.color === '#00C853'? 'rgba(0, 200, 83, 0.1)' : 'rgba(213, 0, 0, 0.1)' }} />
        ))}
      </>
    )
  }

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinearProgress sx={{ width: '50%' }} /></Box>

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white', boxShadow: '0 8px 32px rgba(30, 58, 138, 0.3)' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <AssessmentIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Evaluated Scripts Dashboard</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Total {results.length} scripts evaluated across {subjects.length - 1} subjects</Typography>
            </Box>
            <Button startIcon={<FileDownloadIcon />} variant="contained" onClick={() => window.open(`${API}/download/excel/all`, '_blank')} sx={{ bgcolor: 'white', color: '#1e3a8a', fontWeight: 700, px: 3, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' } }}>Download All Excel</Button>
          </Stack>
        </Paper>

        {/* Subject Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
          <Tabs value={selectedSubject} onChange={(e, v) => setSelectedSubject(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2, borderBottom: '1px solid #e5e7eb', '&.MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', minHeight: 64 } }}>
            {subjects.map((subject, idx) => (
              <Tab key={idx} label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <SchoolIcon sx={{ fontSize: 20 }} />
                  <span>{subject}</span>
                  <Chip label={idx === 0? results.length : results.filter(r => r.subject_name === subject).length} size="small" sx={{ height: 22, fontSize: '0.75rem', bgcolor: selectedSubject === idx? '#1e3a8a' : '#e0e7ff', color: selectedSubject === idx? 'white' : '#1e3a8a', fontWeight: 700 }} />
                </Stack>
              } />
            ))}
          </Tabs>
        </Paper>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <TextField fullWidth placeholder="Search by Roll No or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>), }} sx={{ '&.MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }} />
        </Paper>

        {/* Results Grid */}
        <Grid container spacing={3}>
          {filteredResults.length === 0? (
            <Grid size={12}>
              <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
                <AssessmentIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No results found for this subject</Typography>
              </Paper>
            </Grid>
          ) : (
            filteredResults.map((r) => {
              const percent = ((r.marks_obtained / r.max_marks) * 100).toFixed(1)
              const grade = getGrade(percent)
              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={r.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid #e0e3e7', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.12)', transform: 'translateY(-4px)', borderColor: '#cbd5e1' } }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>{r.roll_no}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{r.name && r.name!== 'NOT_FOUND'? r.name : 'Name Not Extracted'}</Typography>
                        </Box>
                        <Chip label={grade.label} sx={{ fontWeight: 700, bgcolor: grade.bg, color: grade.color, border: `1px solid ${grade.color}40` }} />
                      </Stack>
                      <Chip icon={<SchoolIcon sx={{ fontSize: 16 }} />} label={r.subject_name} size="small" sx={{ mb: 2, bgcolor: '#e0e7ff', color: '#1e3a8a', fontWeight: 700, border: '1px solid #c7d2fe' }} />

                      {/* PDF THUMBNAIL */}
                      {r.image_paths && r.image_paths.length > 0 && (
                        <Box sx={{ mb: 2, border: '2px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#1976d2', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)' } }} onClick={() => handleViewPDF(r)}>
                          <img src={`${API}${r.image_paths[0]}`} alt="Script Preview" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                          <Box sx={{ p: 1, bgcolor: '#f5f5f5', textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
                            <Typography variant="caption" fontWeight={600}>📄 {r.image_paths.length} Page{r.image_paths.length > 1? 's' : ''} - Click to View</Typography>
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderRadius: 2, mb: 2, border: '1px solid #e2e8f0' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <TrendingUpIcon sx={{ color: '#1e3a8a', fontSize: 28 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>{r.marks_obtained}</Typography>
                            <Typography variant="caption" color="text.secondary">out of {r.max_marks}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: grade.color }}>{percent}%</Typography>
                            <LinearProgress variant="determinate" value={parseFloat(percent)} sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '&.MuiLinearProgress-bar': { bgcolor: grade.color, borderRadius: 3 } }} />
                          </Box>
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <Button fullWidth variant="contained" startIcon={<VisibilityIcon />} onClick={() => handleViewPDF(r)} sx={{ borderRadius: 2, py: 1.2, fontWeight: 700, bgcolor: '#1e3a8a', textTransform: 'none', '&:hover': { bgcolor: '#1e40af' } }}>View Script PDF</Button>
                        <Tooltip title="Download PDF">
                          <IconButton onClick={(e) => { e.stopPropagation(); window.open(`${API}/download/pdf/${r.roll_no}`, '_blank') }} sx={{ border: '1px solid #e0e3e7', borderRadius: 2, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                     
                      <Tooltip title="Delete">
                        <IconButton 
                          onClick={(e) => handleDelete(r.roll_no, r.subject_name, e)}  // ✅ subject_name Add করো
                          sx={{ border: '1px solid #e0e3e7', borderRadius: 2, color: '#dc2626', '&:hover': { bgcolor: '#fef2f2' } }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })
          )}
        </Grid>

        {results.length === 0 && (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3, mt: 3 }}>
            <AssessmentIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No evaluations yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Upload a script with Question Paper to start evaluating</Typography>
            <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/')} sx={{ borderRadius: 2, fontWeight: 700 }}>Start Evaluation</Button>
          </Paper>
        )}
      </Container>

      {/* ✅ PDF VIEWER DIALOG WITH MARKINGS + QN-WISE FEEDBACK */}
      <Dialog open={!!openPDF} onClose={() => setOpenPDF(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '95vh' } }}>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton onClick={() => setOpenPDF(null)} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: '#f5f5f5' } }}>
            <CloseIcon />
          </IconButton>

          {openPDF && (
            <>
              <Box sx={{ p: 3, bgcolor: '#1E3A8A', color: 'white' }}>
                <Typography variant="h5" fontWeight={700}>
                  {openPDF.roll_no} - {openPDF.name!== 'NOT_FOUND'? openPDF.name : 'Name Not Extracted'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {openPDF.subject_name} | Score: {openPDF.marks_obtained}/{openPDF.max_marks} ({((openPDF.marks_obtained / openPDF.max_marks) * 100).toFixed(1)}%)
                </Typography>
              </Box>

              {/* PDF Pages with Markings */}
              {openPDF.image_paths && openPDF.image_paths.length > 0 && (
                <Box sx={{ position: 'relative', bgcolor: '#525659' }}>
                  <Box sx={{ position: 'relative' }}>
                    <img key={`img-${currentPage}-${imgKey}`} ref={el => imgRefs.current[currentPage] = el} src={`${API}${openPDF.image_paths[currentPage]}`} alt={`Page ${currentPage + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} onLoad={handleImageLoad} />
                    {renderMarkings()}
                  </Box>
                  {openPDF.image_paths.length > 1 && (
                    <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 3, p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <IconButton size="small" disabled={currentPage === 0} onClick={() => handlePageChange(currentPage - 1)} sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}>
                        <NavigateBeforeIcon />
                      </IconButton>
                      <Typography sx={{ color: 'white', px: 2, fontWeight: 600 }}>Page {currentPage + 1} of {openPDF.image_paths.length}</Typography>
                      <IconButton size="small" disabled={currentPage === openPDF.image_paths.length - 1} onClick={() => handlePageChange(currentPage + 1)} sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}>
                        <NavigateNextIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              )}

              {/* ✅ QUESTION-WISE FEEDBACK SECTION */}
              {resultDetails?.feedback && resultDetails.feedback.length > 0 && (
                <Box sx={{ p: 3, bgcolor: '#f8fafc', maxHeight: '400px', overflowY: 'auto' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#1e3a8a' }}>
                    📊 Question-wise Analysis
                  </Typography>

                  {resultDetails.feedback.map((item, idx) => (
                    <Paper key={idx} sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #e0e3e7' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="start" mb={1.5}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                            {item.question}. {item.question_text?.substring(0, 80)}...
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Chip label={`SBERT: ${item.sbert_score?.toFixed(3) || 0}`} size="small" sx={{ bgcolor: '#e0e7ff', fontWeight: 600 }} />
                            <Chip label={`Cosine: ${item.cosine_score?.toFixed(3) || 0}`} size="small" sx={{ bgcolor: '#fef3c7', fontWeight: 600 }} />
                            <Chip label={`Keywords: ${item.keyword_match || 0}`} size="small" sx={{ bgcolor: '#d1fae5', fontWeight: 600 }} />
                            <Chip label={`Semantic: ${item.semantic_score?.toFixed(3) || 0}`} size="small" sx={{ bgcolor: '#fce7f3', fontWeight: 600 }} />
                          </Stack>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: item.percentage >= 80? '#059669' : item.percentage >= 60? '#1e3a8a' : '#dc2626' }}>
                            {item.score}/{item.max_marks}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: item.percentage >= 80? '#059669' : '#64748b' }}>
                            {item.percentage}%
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography variant="body2" sx={{ color: '#475569', mb: 1, fontWeight: 600 }}>
                        Matched Keywords:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={1.5}>
                        {item.matched_keywords?.map((kw, kidx) => (
                          <Chip key={kidx} label={kw} size="small" sx={{ bgcolor: '#d1fae5', color: '#059669', fontWeight: 600, border: '1px solid #6ee7b7' }} />
                        ))}
                        {(!item.matched_keywords || item.matched_keywords.length === 0) && (
                          <Typography variant="caption" color="text.secondary">No keywords matched</Typography>
                        )}
                      </Stack>

                      <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                        {item.feedback}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}