# Salesperson Setup Guide

## Overview
This CRM system now supports automatic lead assignment to salespersons. Each new lead is automatically assigned to the currently logged-in salesperson.

## Salesperson Accounts

The system includes 6 predefined salesperson accounts:

1. **Sarah Johnson** - sarah.johnson@youclinic.com
2. **Michael Chen** - michael.chen@youclinic.com
3. **Emily Rodriguez** - emily.rodriguez@youclinic.com
4. **David Thompson** - david.thompson@youclinic.com
5. **Lisa Wang** - lisa.wang@youclinic.com
6. **James Wilson** - james.wilson@youclinic.com

## Setup Instructions

### 1. Create Salesperson Accounts
1. Log in as an admin user
2. Navigate to the "Admin" tab in the CRM dashboard
3. Click "Create Salesperson Accounts" button
4. This will create the 6 salesperson accounts in the database

### 2. Salesperson Login
1. Salespersons can sign up using their assigned email addresses
2. The system will automatically recognize these emails and assign the "salesperson" role
3. Salespersons will only see leads assigned to them

### 3. Lead Assignment
- When a salesperson creates a new lead, it's automatically assigned to them
- The salesperson's name is automatically added to the lead record
- Salespersons can only view and manage their own leads
- Admins can view all leads from all salespersons

## User Roles

### Admin
- Can view all leads from all salespersons
- Can create, edit, and delete any lead
- Can manage user roles and create salesperson accounts
- Has access to the Admin panel

### Salesperson
- Can only view leads assigned to them
- Can create new leads (automatically assigned to them)
- Can edit and manage their own leads
- Cannot access the Admin panel

## Features

### Automatic Assignment
- New leads are automatically assigned to the logged-in salesperson
- The salesperson's name is automatically added to the lead record
- No manual assignment required

### Role-Based Access
- Salespersons only see their assigned leads
- Admins see all leads
- Proper access control throughout the application

### User Management
- Admins can view all users in the Admin panel
- Admins can change user roles
- Salesperson accounts are created with proper roles

## Troubleshooting

### If salesperson accounts aren't created:
1. Make sure you're logged in as an admin
2. Check the browser console for any error messages
3. Verify that the admin user has the "admin" role

### If leads aren't being assigned:
1. Make sure the user creating the lead has a "salesperson" or "admin" role
2. Check that the user has a name or email in their profile
3. Verify the lead creation mutation is working properly

### If salespersons can't see their leads:
1. Check that the user has the "salesperson" role
2. Verify that the leads have the correct `assignedTo` field
3. Check the lead listing queries are filtering correctly

## Technical Details

### Database Schema
- Users table includes `role` field for role-based access
- Leads table includes `assignedTo` field linking to user ID
- Leads table includes `salesPerson` field for display name

### Authentication
- Uses Convex Auth with password provider
- Automatic role assignment based on email addresses
- Session management for current user

### API Functions
- `createSalespersonAccounts`: Creates the 6 default accounts
- `updateUserRole`: Allows admins to change user roles
- `getAllUsers`: Admin-only function to view all users
- Lead functions automatically handle assignment and filtering 