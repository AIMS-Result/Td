var app = angular.module('viewDiaryApp', []);

app.controller('ViewController', function($scope, $http) {
    
    // !!! CRITICAL: REPLACE WITH YOUR GOOGLE SHEETS PUBLISHED CSV LINK !!!
    var googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTVlG3VWvzvOzwo36khFV8DA-GoDYSidPBo2i8YWvraDM3eQSkegVaz39x-8Qa4W8Fzf5-raMnSUauM/pub?gid=588909063&single=true&output=csv';
    
    // Core memory datasets
    var allEntries = [];
    $scope.uniqueDates = [];
    $scope.uniqueTeachers = [];
    $scope.uniqueClasses = [];
    
    // Dynamic interactive navigation states
    $scope.currentView = 'menu'; // Tracks views: 'menu', 'date', 'teacher', 'class'
    $scope.selectedDate = '';
    $scope.searchTarget = { teacherName: '', className: '' };
    
    // Selected query identifiers
    $scope.selectedTeacherQuery = '';
    $scope.selectedClassQuery = '';
    
    // Filtered data array maps
    $scope.filteredDateEntries = [];
    $scope.teacherTimelineResults = [];
    $scope.classTrackerResults = [];
    $scope.activeModalEntry = {};
    
    // Security parameters
    $scope.isLoggedIn = false;
    $scope.loginData = { username: '', password: '' };
    $scope.isLoading = false;

    // 1. SESSION ENFORCEMENT & TAB LOCK CHECKS
    function checkAuthenticationState() {
        var activeSession = sessionStorage.getItem('adminAuthToken');
        if (activeSession === 'unlocked_principal_key') {
            $scope.isLoggedIn = true;
            $scope.fetchCloudDatabase();
        }
    }

    $scope.login = function() {
        // Enforces Master administrative credentials locally
        if ($scope.loginData.username === 'Principal' && $scope.loginData.password === 'admin789') {
            $scope.isLoggedIn = true;
            // Stores temporary token that auto-deletes when tab or window closes
            sessionStorage.setItem('adminAuthToken', 'unlocked_principal_key');
            $scope.fetchCloudDatabase();
        } else {
            alert("Security Violation: Invalid credentials.");
        }
    };

    $scope.logout = function() {
        sessionStorage.removeItem('adminAuthToken');
        $scope.isLoggedIn = false;
        $scope.currentView = 'menu';
        $scope.loginData = { username: '', password: '' };
        allEntries = [];
    };

    // 2. LIVE CLOUD DATA AGGREGATION & INGESTION
    $scope.fetchCloudDatabase = function() {
        $scope.isLoading = true;
        $http.get(googleSheetCsvUrl)
            .then(function(response) {
                var parsedResult = Papa.parse(response.data, {
                    header: true,
                    skipEmptyLines: true
                });
                
                allEntries = parsedResult.data;
                
                // Normalizes spreadsheet data across keys
                allEntries.forEach(function(row) {
                    row['Teacher Name'] = row['Teacher Name'] || row['entry.1416561559'];
                    row['Subject'] = row['Subject'] || row['entry.389868599'];
                    row['Date'] = row['Date'] || row['entry.1404280910'];
                    row['Status'] = row['Status'] || row['entry.1247247380'];
                    row['Classroom Records'] = row['Classroom Records'] || row['entry.1058626871'];
                    row['Topics Covered'] = row['Topics Covered'] || row['entry.1740253895'];
                    row['Remarks'] = row['Remarks'] || row['entry.699280446'];
                });

                // Compile analytical values for cross-referencing tabs
                extractUniqueAnalyticalFilters();
                
                $scope.isLoading = false;
            })
            .catch(function(err) {
                console.error("Database connection fault:", err);
                alert("Cloud Sync Interrupted. Verify link configurations.");
                $scope.isLoading = false;
            });
    };

    // Compiles distinct filter items
    function extractUniqueAnalyticalFilters() {
        var rawDates = [];
        var rawTeachers = [];
        var rawClassesSet = new Set();

        allEntries.forEach(function(row) {
            if (row['Date']) rawDates.push(row['Date']);
            if (row['Teacher Name']) rawTeachers.push(row['Teacher Name'].trim());
            
            // Scans and pulls out exact class labels from compressed strings
            if (row['Classroom Records'] && row['Status'] !== 'Absent' && row['Status'] !== 'Sick Leave') {
                var lines = row['Classroom Records'].split('\n');
                lines.forEach(function(line) {
                    var partition = line.split(':');
                    if (partition.length > 1) {
                        var extractedClassName = partition.slice(1).join(':').trim();
                        if(extractedClassName && extractedClassName !== 'Free/Blank') {
                            rawClassesSet.add(extractedClassName);
                        }
                    }
                });
            }
        });

        // Unique Dates sorted newest first
        $scope.uniqueDates = [...new Set(rawDates)].sort(function(a,b){ return new Date(b) - new Date(a); });
        $scope.uniqueTeachers = [...new Set(rawTeachers)];
        $scope.uniqueClasses = Array.from(rawClassesSet).sort();

        // Default initial date selection configuration
        if($scope.uniqueDates.length > 0) {
            $scope.selectDate($scope.uniqueDates[0]);
        }

    }
        

    // 3. PERSPECTIVE VIEW TRANSITIONS
    $scope.changeView = function(viewName) {
        $scope.currentView = viewName;
    };

    // View Perspective 1 Logic: Filter by Selected Date
    $scope.selectDate = function(date) {
        $scope.selectedDate = date;
        $scope.filteredDateEntries = allEntries.filter(function(row) {
            return row['Date'] === date;
        });
    };

    // View Perspective 2 Logic: Filter by Teacher
    $scope.processTeacherQuery = function() {
        if(!$scope.searchTarget.teacherName) {
            alert("Please pick a valid teacher name first.");
            return;
        }
        $scope.selectedTeacherQuery = $scope.searchTarget.teacherName;
        $scope.teacherTimelineResults = allEntries.filter(function(row) {
            return row['Teacher Name'] && row['Teacher Name'].trim() === $scope.selectedTeacherQuery;
        }).sort(function(a,b){ return new Date(b['Date']) - new Date(a['Date']); });
    };

    // View Perspective 3 Logic: Filter by Class (Deep Processing)
    $scope.processClassQuery = function() {
        if(!$scope.searchTarget.className) {
            alert("Please pick a target classroom section.");
            return;
        }
        $scope.selectedClassQuery = $scope.searchTarget.className;
        var matchingAggrList = [];

        allEntries.forEach(function(row) {
            if (row['Status'] === 'Absent' || row['Status'] === 'Sick Leave') return;
            
            var classLines = (row['Classroom Records'] || '').split('\n');
            var topicLines = (row['Topics Covered'] || '').split('\n');

            classLines.forEach(function(line, idx) {
                var part = line.split(':');
                if(part.length > 1) {
                    var extractedClass = part.slice(1).join(':').trim();
                    
                    // Match found! Map the lesson details
                    if(extractedClass === $scope.selectedClassQuery) {
                        var matchedTopicInfo = "Information Blank / Free Period";
                        
                        // Extract corresponding topic line matching this specific lecture number
                        if(topicLines[idx]) {
                            var tPart = topicLines[idx].split(':');
                            if(tPart.length > 1) {
                                matchedTopicInfo = tPart.slice(1).join(':').trim();
                            }
                        }

                        matchingAggrList.push({
                            date: row['Date'],
                            teacher: row['Teacher Name'],
                            subject: row['Subject'],
                            lecNumber: (idx + 1),
                            topics: matchedTopicInfo
                        });
                    }
                }
            });
        });

        $scope.classTrackerResults = matchingAggrList.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
        
        if(matchingAggrList.length === 0) {
            alert("No lecture reports found matches inside: " + $scope.selectedClassQuery);
        }
    };

    $scope.setActiveModalEntry = function(entry) {
        $scope.activeModalEntry = entry;
    };

    // Auto-verify secure configurations on initialization
    checkAuthenticationState();
});
