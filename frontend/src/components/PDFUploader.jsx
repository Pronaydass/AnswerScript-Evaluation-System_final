import { useState } from 'react'
import { Button, Box, Chip } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'

export default function PDFUploader({ label, onFileSelect, accept = '.pdf,.png,.jpg,.jpeg' }) {
  const [file, setFile] = useState(null)

  const handleChange = (e) => {
    const f = e.target.files[0]
    setFile(f)
    onFileSelect(f)
  }

  return (
    <Box>
      <Button
        variant="outlined"
        component="label"
        startIcon={<UploadFileIcon />}
        sx={{ justifyContent: 'flex-start', textTransform: 'none', fontFamily: 'inherit' }}
      >
        {label}
        <input type="file" hidden accept={accept} onChange={handleChange} />
      </Button>
      {file && (
        <Chip
          label={file.name}
          size="small"
          onDelete={() => {
            setFile(null)
            onFileSelect(null)
          }}
          sx={{ ml: 1, mt: 1 }}
        />
      )}
    </Box>
  )
}