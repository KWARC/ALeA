# Getting Started with ALeA

This guide walks you through setting up and running the **ALeA** project, which includes:
- **alea-frontend** (Next.js frontend)

## Prerequisites  
Ensure you have the following installed on your system before proceeding:
- **Node.js** (Recommended: `LTS`) – [Download](https://nodejs.org/)
- **npm** (Recommended: `latest`) – `npm install -g npm@latest`
- **Git** – [Download](https://git-scm.com/)
- **MySQL** & **MySQL Workbench** – [Download](https://dev.mysql.com/downloads/)
- **nx** - `npm install -g nx`

## Installation  

1. **Clone the Repository**  
   ```sh
   git clone https://github.com/slatex/ALeA.git
   cd ALeA
   ```

2. **Install Dependencies**  
   ```sh
   npm install
   ```

## Database Setup

The project uses **Prisma** for database migrations. Ensure MySQL is running and the database exists before running migrations.

1. **Create the database** (if it does not exist)
   - Open MySQL Workbench or use the MySQL CLI.
   - Create the database: `CREATE DATABASE comments_test;` (or your chosen database name).

2. **Configure environment variables**
   - Create `packages/alea-frontend/.env.local` with the following database connection variables (update as required):

   ```
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=password
   MYSQL_COMMENTS_DATABASE=comments_test
   ```

3. **Run Prisma migrations**
   - Deploy migrations to create/update tables:
     ```sh
     npm run prisma:migrate-deploy
     ```
   - For development with migration creation, use:
     ```sh
     npm run prisma:migrate-dev
     ```

4. **Generate Prisma client**
   - The client is generated automatically by the prebuild step. To generate manually:
     ```sh
     npm run prisma:generate
     ```

## Running the Applications  

### alea-frontend (Next.js)  

#### Local Development  
```sh
npm run start alea-frontend
```
- Runs on `http://localhost:4200`  



   
## Access Control List (ACL) Setup

This guide provides step-by-step instructions to create and configure an Access Control List (ACL) in the system.

### Step 1: Run Initial SQL Setup

Execute the SQL queries from the `intialSqlSetup.sql` file to set up the sys-admin ACL, initial course metadata, and other required data.


### Step 2: Assign Resource-Action Permissions

1. Navigate to the **exp** page in the application.
2. Locate and click on the **system-administrator** button.
3. Follow the prompts to create a resource-action assignment by specifying the desired resources and actions that the `sys-admin` role should control.
4. Save the changes.

### Step 3: University Admin Setup

Set up the university admin to access the university and create semesters:

1. **Create the university admin ACL** on the ACL page (`/acl`): Click "Create new ACL" and create the ACL (e.g., `fau-admin` for FAU). Set the updater ACL to `sys-admin` and add the desired user(s) as members.
2. **Assign resource-action**: Navigate to the **exp** page and click the **system-administrator** button to open the sys-admin panel. Assign the resource-action: resource `/university/{universityId}/university-sem-info` with action `MUTATE` to the `{universityId}-admin` ACL (replace `{universityId}` with your university ID, e.g., `FAU`).
3. The university admin can then navigate to `/u/{universityId}/university-admin` to access the dashboard and create semesters.

### Step 4: Create Semester and Add Course to Semester

Prerequisites: Complete Step 3 to set up the `{universityId}-admin` ACL and resource-action. Admins should see the "go to university admin page" link at `/u/{universityId}`.

1. **Select semester**: Go to the University Admin page (`/u/{universityId}/university-admin`) and select the semester to which you want to add a course. Create a new semester if needed.
2. **Add course**: In the Course Management section, select a course from the dropdown menu or manually enter the Course ID. Click the **Add Course to Semester** button.
3. **Create Instructor ACL**: After adding the course, click the **Create Instructor ACL** button next to the Course ID. The ACL is created immediately—you can navigate directly to the ACL page (`/acl/{courseId}-{instanceId}-instructors`) to edit it and add instructor members. Then request the Sys-Admin to approve the course.
4. **Sys-Admin approval**: The Sys-Admin approves the course by performing a **Quick Course Access Setup** from the sys-admin panel. After approval, instructors added to that course's ACL can access the Instructor Dashboard.
5. **Instructor setup**: The instructor can now access the **Access Control** tab in the Instructor Dashboard. Click the **Default Resource-Action Setup** button to create the resource-action assignments for the course. Once complete, all tabs in the Instructor Dashboard become available.

## Fake User Login

1. *Login Flow*  
   - User clicks on the *Login* button when getting started.
   - A warning message appears, and the user must click on the *warning* word.
   - The user then enters a 3-letter word (e.g., abc, xyz).
   - The system automatically creates a fake user with the username fake_abc or fake_xyz.  

## Job Portal ACL for Students

- An open ACL `job-portal-students` for all FAU students registering on the Job Portal.
- Anyone with a valid FAU ID can join this ACL.

#### Database Entry

```sql
INSERT INTO AccessControlList (id, description, updaterACLId, isOpen)
VALUES (
  'job-portal-students',
  'students enrolled in job portal',
  'sys-admin',
  1
);
```
- Run the following SQL query to add corresponding resource access control:
(**NOTE**: replace semester name in `resourceId` with the current `semesterId` **or** prefer **UI** instead of using this sql query to add resourceAccess control)

   ```sql
   INSERT INTO ResourceAccess (resourceId, actionId, aclId) 
   VALUES ('/instance/WS25-26/job-portal', 'APPLY', 'job-portal-students');
   ```

## Job Portal ACL for ADMINS

- A closed ACL `job-portal-admins` for admins of Job Portal.
- System Administrator will decide whom to make admin.

#### Database Entry

```sql
INSERT INTO AccessControlList (id, description, updaterACLId, isOpen)
VALUES (
  'job-portal-admins',
  'Admins of job portal',
  'sys-admin',
  0
);
```

- Run the following SQL query to add corresponding resource access control:(**NOTE**: replace semester name in `resourceId` with the current `semesterId` **or** prefer **UI** instead of using this sql query to add resourceAccess control)

   ```sql
   INSERT INTO ResourceAccess (resourceId, actionId, aclId) 
   VALUES ('/instance/WS25-26/job-portal', 'MANAGE_JOB_TYPES', 'job-portal-admins');
   ```

- After ACL is being created ,add members into `job-portal-admins` **manually using UI**.

## Job Portal ACL for ADMINS

- A closed ACL `job-portal-admins` for admins of Job Portal.
- System Administrator will decide whom to make admin.

#### Database Entry

```sql
INSERT INTO AccessControlList (id, description, updaterACLId, isOpen)
VALUES (
  'job-portal-admins',
  'Admins of job portal',
  'sys-admin',
  0
);
```
- After ACL is being created ,add members into `job-portal-admins` manually using UI.

## env.local

Create a .env.local file inside the packages/alea-frontend directory with the following content:

`packages/alea-frontend/.env.local`

```
NEXT_PUBLIC_FLAMS_URL=https://mathhub.info
NEXT_PUBLIC_AUTH_SERVER_URL=https://lms.voll-ki.fau.de
NEXT_PUBLIC_LMP_URL=https://lms.voll-ki.fau.de
NEXT_PUBLIC_GPT_URL=http://127.0.0.1:5000
NEXT_PUBLIC_SITE_VERSION=development

#For database connection, update as required
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_COMMENTS_DATABASE=comments_test
```



## Set Up Environment Variables for Prebuild Scripts (Optional)

Create a .env.local file inside the prebuild-scripts directory with the following content:

` prebuild-scripts/.env.local`
```
BLOG_INFO_FILE=./blogData.json
BLOG_INFO_DIR=./static
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_COMMENTS_DATABASE=comments_test
```
