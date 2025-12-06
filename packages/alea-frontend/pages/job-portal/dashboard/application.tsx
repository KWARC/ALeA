'use client';

import React, { useState } from 'react';
import { Search, Phone, Mail, ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  Button,
  Box,
  Typography,
  InputBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { PRIMARY_COL } from '@alea/utils';

const Applications = () => {
  const [sortOrder, setSortOrder] = useState('newest');
  const [companySortOrder, setCompanySortOrder] = useState('asc');
  const [applications, setApplications] = useState([
    { date: 'June 1, 2024', company: 'Highspeed Studios', position: 'Intern UI Designer' },
    { date: 'June 10, 2024', company: 'Mosciski Inc.', position: 'Software Engineer' },
    { date: 'June 15, 2024', company: 'Mosciski Inc.', position: 'Full Stack Dev' },
    { date: 'June 20, 2024', company: 'Highspeed Studios', position: 'Intern SWE' },
  ]);

  const toggleSortOrder = () => {
    const sortedApplications = [...applications].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'newest'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });
    setApplications(sortedApplications);
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const toggleCompanySortOrder = () => {
    const sortedApplications = [...applications].sort((a, b) => {
      return companySortOrder === 'asc'
        ? a.company.localeCompare(b.company)
        : b.company.localeCompare(a.company);
    });
    setApplications(sortedApplications);
    setCompanySortOrder(companySortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', fontFamily: 'Roboto' }}>
      <Box sx={{ flex: 1, background: '#f4f4f4', padding: '20px' }}>
        <Box
          sx={{
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <Button variant="contained" sx={{ backgroundColor: PRIMARY_COL }}>
              All
            </Button>
            <Button variant="contained" sx={{ backgroundColor: PRIMARY_COL }}>
              Pending
            </Button>
            <Button variant="contained" sx={{ backgroundColor: PRIMARY_COL }}>
              On-Hold
            </Button>
            <Button variant="contained" sx={{ backgroundColor: PRIMARY_COL }}>
              Candidate
            </Button>
          </Box>

          <Button
            variant="contained"
            sx={{ backgroundColor: PRIMARY_COL }}
            onClick={toggleSortOrder}
          >
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </Button>
        </Box>

        {/* Applications Table */}
        <Paper
          sx={{
            background: 'white',
            padding: '15px',
            marginTop: '15px',
            borderRadius: '5px',
            boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)',
          }}
        >
          <TableContainer>
            <Table sx={{ width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell onClick={toggleSortOrder} sx={{ cursor: 'pointer' }}>
                    Date Applied
                  </TableCell>
                  <TableCell
                    onClick={toggleCompanySortOrder}
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      paddingLeft: '30%',
                    }}
                  >
                    Company{' '}
                    {companySortOrder === 'asc' ? (
                      <ExpandLess sx={{ fontSize: 16 }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 16 }} />
                    )}
                  </TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((app, index) => (
                  <TableRow key={index} sx={{ textAlign: 'center' }}>
                    <TableCell>{app.date}</TableCell>
                    <TableCell>{app.company}</TableCell>
                    <TableCell>{app.position}</TableCell>
                    <TableCell>
                      <Phone sx={{ fontSize: 18 }} />
                      <Mail sx={{ fontSize: 18, marginLeft: '10px' }} />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          background: 'blue',
                          borderRadius: '50px',
                          padding: '5px',
                          color: 'white',
                        }}
                      >
                        Pending
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        sx={{ backgroundColor: 'green', color: 'white', margin: '5px' }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="contained"
                        sx={{ backgroundColor: 'red', color: 'white', margin: '5px' }}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default Applications;
