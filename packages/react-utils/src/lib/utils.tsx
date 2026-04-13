import { SvgIconProps } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ImageIcon from '@mui/icons-material/Image';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DataObjectIcon from '@mui/icons-material/DataObject';

export const getIconByExtension = (ext: string, props?: SvgIconProps) => {
  switch (ext) {
    case '.pdf':
      return <PictureAsPdfIcon color="error" {...props} />;
    case '.doc':
    case '.docx':
      return <DescriptionIcon color="primary" {...props} />;
    case '.xls':
    case '.xlsx':
    case '.csv':
      return <TableChartIcon color="success" {...props} />;
    case '.ppt':
    case '.pptx':
      return <SlideshowIcon color="warning" {...props} />;
    case '.zip':
    case '.rar':
    case '.7z':
      return <FolderZipIcon {...props} />;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
      return <ImageIcon {...props} />;
    case '.txt':
    case '.md':
      return <TextSnippetIcon {...props} />;
    case '.json':
      return <DataObjectIcon {...props} />;
    default:
      return <InsertDriveFileIcon {...props} />;
  }
};
