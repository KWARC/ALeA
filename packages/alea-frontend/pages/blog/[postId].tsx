import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import {
  BlogPost,
  UserInfo,
  deleteBlogPost,
  getPostById,
  getUserInfo,
  isModerator,
} from '@stex-react/api';
import { MdViewer } from '@stex-react/markdown';
import fs from 'fs';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';

const BlogPostPage: NextPage = ({ post }: { post: BlogPost }) => {
  const router = useRouter();
  const postId = router.query.postId;
  const [userInfo, setUserInfo] = useState<UserInfo>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blogPost, setBlogPost] = useState<BlogPost>(post);

  useEffect(() => {
    getUserInfo().then(setUserInfo);
  }, []);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const blogData = await getPostById(postId as string);
        setBlogPost(blogData);
      } catch (error) {
        alert('the page youe are looking for is not available');
        router.push('/blog');
      }
    }
    if (router.isReady && postId) {
      fetchBlog();
    }
  }, [router.isReady, postId, router]);

  const toggleDeleteDialogOpen = () => {
    setDeleteDialogOpen((prevState) => !prevState);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteBlogPost(postId as string);
      alert('Post deleted successfully');
      router.push('/blog');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (router.isFallback || !blogPost || !postId) {
    return <>loading...</>;
  }

  return (
    <MainLayout>
      <Box mx="10px">
        <Box m="0 auto" maxWidth="800px">
          <Box display="flex" justifyContent="space-between" m="20px">
            <Link href="/blog">
              <Button variant="contained">All Posts</Button>
            </Link>
            {isModerator(userInfo?.userId) && (
              <Box display="flex" gap="10px">
                <Link href={`/blog/edit?postId=${blogPost.postId}`}>
                  <IconButton>
                    <EditIcon />
                  </IconButton>
                </Link>
                <IconButton onClick={toggleDeleteDialogOpen}>
                  <DeleteIcon color="warning" />
                </IconButton>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: '20px',
              m: '20px',
              minHeight: 'calc(100vh - 270px)',
              boxShadow: '0 0 10px 0 gray',
              borderRadius: '5px',
            }}
          >
            <MdViewer content={blogPost.title} />
            <hr />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                <MdViewer content={blogPost.authorName} />
              </Typography>
              <Typography fontWeight="bold">
                <MdViewer content={blogPost.createdAt.split('T')[0]} />
              </Typography>
            </Box>
            <MdViewer content={blogPost.body} />
          </Box>
        </Box>
      </Box>
      <Dialog open={deleteDialogOpen} onClose={toggleDeleteDialogOpen}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this post?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleDeleteDialogOpen}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="warning">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default BlogPostPage;

export async function getStaticPaths() {
  const data = fs.readFileSync('../../static/blogData.json', 'utf-8');
  const jsonData = JSON.parse(data);
  const paths = jsonData.map((blog: BlogPost) => ({
    params: { postId: blog.postId },
  }));
  return { paths, fallback: true };
}

export async function getStaticProps({
  params,
}: {
  params: { postId: string };
}) {
  try {
    const data = fs.readFileSync('../../static/blogData.json', 'utf-8');
    const jsonData = JSON.parse(data);
    const post = jsonData.find(
      (blog: BlogPost) => blog.postId === params.postId
    );
    if (!post) {
      return { props: { post: null } };
    }
    return {
      props: {
        post,
      },
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return {
      props: {
        post: null,
      },
    };
  }
}
