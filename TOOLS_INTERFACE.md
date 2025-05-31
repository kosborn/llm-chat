# Tools Interface

A comprehensive web interface for exploring, managing, and configuring AI tools in the chat application.

## Overview

The Tools Interface provides users with a visual way to:

- Browse all available AI tools
- View detailed information about each tool
- Enable/disable tools
- Filter and search tools by various criteria
- Understand tool parameters and usage

## Features

### 🔍 Tool Discovery

- **Grid View**: Visual cards showing tool information at a glance
- **Search**: Find tools by name, description, or tags
- **Category Filtering**: Filter by tool categories (utility, data, communication, etc.)
- **Tag Filtering**: Filter by specific functionality tags
- **Status Filtering**: Show only enabled or all tools

### 📊 Tool Information

- **Basic Details**: Name, description, version, author
- **Parameters**: Detailed parameter specifications with types and descriptions
- **Categories & Tags**: Organized classification system
- **Status**: Real-time enable/disable state

### ⚙️ Tool Management

- **Toggle Tools**: Enable/disable tools with visual feedback
- **Bulk Operations**: Apply filters to manage multiple tools
- **Real-time Updates**: Changes reflect immediately across the interface

### 📈 Statistics Dashboard

- Total tool count
- Enabled/disabled breakdown
- Category and tag statistics
- Live updates as tools are toggled

## Navigation

Access the Tools Interface via:

- **Main Navigation**: Click "Tools" in the top navigation bar
- **Direct URL**: `/tools`

## Interface Layout

### Left Sidebar (Filters & Stats)

- **Search Bar**: Real-time text search
- **Category Dropdown**: Filter by tool categories
- **Tag Dropdown**: Filter by functionality tags
- **Enabled Only Checkbox**: Show only active tools
- **Clear Filters Button**: Reset all filters
- **Statistics Panel**: Live tool metrics

### Main Content Area

- **Tool Cards Grid**: Responsive grid of tool cards
- **Empty State**: Helpful message when no tools match filters
- **Tool Detail Modal**: Comprehensive tool information overlay

## Tool Categories

### 🛠️ Utility

General-purpose tools for common tasks:

- **Calculator**: Mathematical calculations
- **Weather**: Weather information lookup
- **Time**: Time and date operations
- **Text Processor**: Text manipulation and analysis

### 📊 Data

Data processing and formatting tools:

- **JSON Formatter**: JSON validation, formatting, and manipulation
- **URL Tools**: URL validation and processing

### 🎲 Entertainment

Fun and creative tools:

- **Random Generator**: Generate random numbers, strings, and choices

## Tool Information

Each tool provides:

### Basic Metadata

- **Name**: Unique tool identifier
- **Description**: What the tool does
- **Version**: Current tool version
- **Author**: Tool creator
- **Category**: Functional classification
- **Tags**: Searchable keywords

### Parameters Schema

- **Parameter Name**: Input field identifier
- **Type**: Data type (string, number, boolean, enum)
- **Description**: Usage instructions
- **Required/Optional**: Whether parameter is mandatory
- **Default Values**: Pre-set values when applicable

### Status Management

- **Enable/Disable Toggle**: Control tool availability
- **Visual Indicators**: Clear status representation
- **Immediate Updates**: Changes apply instantly

## Usage Examples

### Finding Calculation Tools

1. Navigate to Tools interface
2. Type "math" in search bar
3. Or select "utility" category
4. Or filter by "calculation" tag

### Viewing Tool Details

1. Click "View Details" on any tool card
2. Review parameter specifications
3. Check usage examples
4. Toggle enable/disable as needed

### Managing Tool Availability

1. Use toggle switches on tool cards
2. Or use toggle in detail modal
3. Changes apply immediately to chat interface
4. Statistics update in real-time

## Technical Details

### Tool Registration

Tools are automatically discovered and registered from:

```
src/lib/tools/implementations/
```

### Tool Structure

Each tool implements:

- Configuration metadata
- Parameter schema (Zod validation)
- Execution function
- Error handling

### State Management

- Real-time synchronization with tool registry
- Persistent enable/disable state
- Live statistics calculation

### Responsive Design

- Mobile-friendly grid layout
- Accessible navigation
- Dark/light theme support
- Touch-friendly controls

## Development

### Adding New Tools

1. Create tool implementation in `src/lib/tools/implementations/`
2. Register in `src/lib/tools/registry.ts`
3. Tool appears automatically in interface

### Customizing Interface

- Modify components in `src/lib/components/`
- Update styling via Tailwind CSS classes
- Extend filtering logic in `ToolsExplorer.svelte`

### Tool Categories

Add new categories by:

1. Using new category in tool configuration
2. Adding color mapping in `ToolCard.svelte`
3. Category appears automatically in filters

## Accessibility

The interface includes:

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management in modals
- Semantic HTML structure

## Browser Support

Compatible with:

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers
- Progressive Web App features
- Offline functionality (when available)
