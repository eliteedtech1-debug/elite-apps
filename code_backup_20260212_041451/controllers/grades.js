"use strict";

// const db= require("../models");
const db = require("../models");
const gradeSetup = (req, res) => {
  // const {  } = req.body;
  const {
    query_type = null,
    id = null,
    section = '',
    grade = null,
    remark = null,
    min_score=null, 
    max_score = null,
    status = null
  } = req.body;
  db.sequelize.query(`CALL grade_setup(:query_type,:id,:section,:grade,:remark,:min_score,:max_score,:status,:school_id)`, {
    replacements: {
      query_type,
      id,
      section,
      grade,
      remark,
      min_score, 
      max_score,
      status,
      school_id: req.user.school_id
    }
  }).then(results => res.json({
    success: true,
    data: results
  })).catch(err => {
    console.log(err);
    res.status(500).json({
      success: false
    });
  });
};
const examCaSetup = (req, res) => {
  const { query_type = 'SELECT', school_id } = req.body;
  const schoolId = school_id || req.user.school_id;

  if (query_type === 'SELECT') {
    db.sequelize.query(
      `SELECT id, ca_type, is_active, school_id, section, status 
       FROM ca_setup 
       WHERE school_id = :school_id AND is_active = 1`,
      {
        replacements: { school_id: schoolId },
        type: db.sequelize.QueryTypes.SELECT
      }
    )
    .then(results => {
      res.json({
        success: true,
        data: results
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        success: false,
        message: err.message || 'An error occurred while processing the request.'
      });
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Only SELECT query_type is supported'
    });
  }
};



const htmlPdf = require('html-pdf-node');
const examReports = async (req, res) => {
  const exam = [{
    subject: 'English Language',
    ca1: 10,
    ca2: 20,
    exam: 50,
    grade: 'B'
  }, {
    subject: 'Mathematics',
    ca1: 15,
    ca2: 25,
    exam: 55,
    grade: 'A'
  }, {
    subject: 'Chemistry',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }, {
    subject: 'Physics',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }, {
    subject: 'Biology',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }, {
    subject: 'Geography',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }, {
    subject: 'Agric Science',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }, {
    subject: 'Computer Science',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }, {
    subject: 'Animal Husbandry',
    ca1: 12,
    ca2: 18,
    exam: 45,
    grade: 'B'
  }
  // Add more subjects here
  ];
  const rows = exam.map(item => `
    <tr>
      <td style="padding: 3px; font-size: 10px; text-align: left; border: 2px solid #797878;>
        ${item.subject}
      </td>
      <td style="padding: 3px; font-size: 10px; text-align: center; border: 2px solid #797878;>
        ${item.ca1}
      </td>
      <td style="padding: 3px; font-size: 10px; text-align: center; border: 2px solid #797878;>
        ${item.ca2}
      </td>
      <td style="padding: 3px; font-size: 10px; text-align: center; border: 2px solid #797878;>
        ${item.ca1 + item.ca2}
      </td>
      <td style="padding: 3px; font-size: 10px; text-align: center; border: 2px solid #797878;>
        ${item.exam}
      </td>
      <td style="padding: 3px; font-size: 10px; text-align: center; border: 2px solid #797878;>
        ${item.ca1 + item.ca2 + item.exam}
      </td>
      <td style="padding: 3px; font-size: 10px; text-align: center; border: 2px solid #797878;>
        ${item.grade}
      </td>
    </tr>`).join('');
  const htmlContent = `
 <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Centered PDF</title>
     <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      @page {
        size: A1;
        margin: 3mm; /* Adds margin to all sides of the page */
      }

      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
      }

      .pdf-container {
        width: 100%; /* Set width to make it narrower */
        margin: auto; /* Center horizontally */
        padding: 5px; /* Add space inside container */
        box-sizing: border-box;
      }


      th,
      td {
        border: 1px solid #797878;
        padding: 2px;
        text-align: center;
      }

      th {
        font-size: 10px;
      }

      td {
        font-size: 10px;
      }

      footer {
        margin-top: 30px;
        font-size: 10px;
        text-align: center;
      }

      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      }

      .signature {
        text-align: center;
      }

      .signature img {
        width: 80px;
        height: 80px;
        visibility: hidden;
      }

      .seal img {
        width: 80px;
        height: 80px;
      }

      .signature div {
        border-top: 1px solid gray;
        margin-top: 10px;
      }

      .signature p {
        margin: 0;
        padding: 0;
      }
        header {
    width: 100%;
    height: 80px;
    margin-bottom: 10px;
    text-align: center;
    border-bottom: 1px solid #ccc;
  }

  .header-container {
    width: 100%;
    margin: 0 auto;
    display: table;
    table-layout: fixed;
  }

  .logo,
  .header-text,
  .address {
    display: table-cell;
    vertical-align: middle;
  }

  .logo img {
    width: 70px;
    height: 70px;
  }
  .logo{
    width:20%;
    text-align:left;
  }
  .header-text {
    text-align: center;
    padding: 0 20px;
  }

  .header-text h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #000000d3;
  }

  .header-text span {
    font-size: 10px;
    color: rgba(0, 0, 0, 0.6);
    display: block;
    margin-top: 2px;
  }
    .header-text{
    width:78%;
    }

  .address {
    text-align: right;
    font-size: 10px;
    color: rgba(0, 0, 0, 0.6);
  }
    </style>
  </head>
  <body>
    <div class="pdf-container" style="width: 100%; margin: 5px; padding: 5px; box-sizing: border-box;>
      <!-- Header Section -->
      <header>
        <div class="header-container">
          <!-- Logo on the Left -->
          <div class="logo">
            <img src="/config/YMA.png" alt="School Logo" />
          </div>

          <!-- Centered Header Text -->
          <div class="header-text">
            <h2>Yazid Memorial Academy</h2>
            <p>1264 Satellite Town, Tudun Yola, Kabuga Kano</p>
          </div>
        </div>
      </header>
      <section style="margin-top:50px">
        <!-- First Table -->
        <div 
          style="
          width: 100%;
          margin: 0 auto;
          display: table;
          table-layout: fixed;> 
          <table
            style=" 
              display: table-cell;
              vertical-align: left;
              width: 60%; border-collapse: collapse; margin-bottom: 15px"
          >
          <thead>
            <tr>
              <th
                style="
                  border-left: 1px solid #797878;
                  font-size: 10px;
                  padding: 5px;
                  width: 50%;
                  border: 2px solid #797878;
                "
                colspan="7"
              >
              Academic Record
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Table rows with same styling pattern -->
            <tr style="background-color: #f9f9f9">
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: left;
                  font-weight: 500;
                  width: 20%;
                  border: 2px solid #797878;
                "
              >
                Subjects
              </td>
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: center;
                  border: 2px solid #797878;
                "
              >
                T1
              </td>
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: center;
                  border: 2px solid #797878;
                "
              >
                ASS
              </td>
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: center;
                  border: 2px solid #797878;
                "
              >
                TOTAL C.A
              </td>
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: center;
                  border: 2px solid #797878;
                "
              >
                EXAM
              </td>
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: center;
                  border: 2px solid #797878;
                  font-spacing:-2;
                "
              >
                TOTAL SCORE
              </td>
              <td
                style="
                  padding: 3px;
                  font-size: 10px;
                  text-align: center;
                
                "
              >
              <span style=" display: inline-block;
                  transform: rotate(90deg);
                  transform-origin: center;
                  font-spacing:-4;
                  ">GRADE</span>
              </td>
            </tr>
          ${rows}
          </tbody>
      </table>
      
    <table border="1" cellspacing="0" cellpadding="1" style="
    display: table-cell;
    vertical-align: left; width: 20%; border-collapse: collapse; font-size:8px">
     <thead>
        <tr>
          <th colspan="2" style="text-align: center; font-weight: bold;>MORAL VALUES AND CHARACTERS</th>
        </tr>
        <tr>
          <th style="text-align: left;>SKILLS</th>
          <th style="text-align: left;>Grade</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Hand Writting</td>
          <td>A</td>
        </tr>
        <tr>
          <td>Fluency</td>
          <td>B</td>
        </tr>
        <tr>
          <td>Handing of Tools</td>
          <td>B</td>
        </tr>
        <tr>
          <td>Arts & Craft Acivities</td>
          <td>A</td>
        </tr>
        <tr>
          <td>Games</td>
          <td>B</td>
        </tr>
      </tbody>
      <thead>
        <tr>
          <th colspan="2" style="text-align: center; font-weight: bold;>KEY RATING</th>
        </tr>
        <tr>
          <th style="text-align: left;>Remark</th>
          <th style="text-align: left;>Grade</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A=Excellent</td>
          <td>75%&nbsp;&&nbsp;above</td>
        </tr>
        <tr>
          <td>B=V.&nbsp;Good</td>
          <td>70%&nbsp;to&nbsp;74%</td>
        </tr>
        <tr>
          <td>D&nbsp;=&nbsp;Average</td>
          <td>50%&nbsp;to&nbsp;59%</td>
        </tr>
        <tr>
          <td>E&nbsp;=&nbsp;Fair</td>
          <td>40%&nbsp;to&nbsp;49%</td>
        </tr>
        <tr>
          <td>F&nbsp;=&nbsp;Poor</td>
          <td>0%&nbsp;to&nbsp;39%</td>
        </tr>
      </tbody>
    </table>
  </div>
     
      </section>
     <section style="width: 100%; margin: 0 auto; overflow: hidden;>
  <!-- Table Section -->
 
  <!-- Image Section -->
  <div style="width: 58%; float: right; text-align: center;>
   <!-- <img
      src="http://placehold.it/500.png"
      alt="Placeholder Image"
      style="width: 100%; height: 250px; display: block; margin: 0 auto;
    /> -->
    <div style="width: 80%; margin: auto;>
    <canvas id="subjectChart"></canvas>
  </div>
  </div>

  <!-- Clearfix -->
  <div style="clear: both;></div>
</section>


      <!-- Footer -->
      <footer>
        <div class="signatures">
          <div class="signature">
            <img src="./seal.jpg" />
            <div></div>
            <p>Signature of Class Teacher</p>
          </div>
          <div class="seal">
            <img src="./seal.jpg" />
            <p>Institution Seal</p>
          </div>
          <div class="signature">
            <img src="./seal.jpg" />
            <div></div>
            <p>Signature of Head Teacher</p>
          </div>
        </div>
      </footer>
    </div>
  </body>
  <script>
    // Data array
    const data = [
      { subject: 'English', total: 80, avg: 45 },
      { subject: 'Mathematics', total: 90, avg: 50 },
      { subject: 'Science', total: 75, avg: 60 },
      { subject: 'History', total: 85, avg: 70 },
      // Add more subjects as needed
    ];

    // Extract labels and datasets
    const labels = data.map(item => item.subject); // Subjects
    const totalScores = data.map(item => item.total); // Total scores
    const averageScores = data.map(item => item.avg); // Average scores

    // Create the chart
    const ctx = document.getElementById('subjectChart').getContext('2d');
    const subjectChart = new Chart(ctx, {
      type: 'bar', // Bar chart type
      data: {
        labels: labels, // X-axis labels
        datasets: [
          {
            label: 'Total Score',
            data: totalScores, // Y-axis data for Total
            backgroundColor: 'rgba(75, 192, 192, 0.6)', // Bar color
            borderColor: 'rgba(75, 192, 192, 1)', // Border color
            borderWidth: 1,
          },
          {
            label: 'Class Average',
            data: averageScores, // Y-axis data for Average
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top', // Legend position
          },
          title: {
            display: true,
            text: 'Subject Performance Chart'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Subjects'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Scores'
            },
            beginAtZero: true
          }
        }
      }
    });
  </script>
</html>

  `;
  
  try {
    const file = { content: htmlContent };
    const buffer = await htmlPdf.generatePdf(file, { format: 'A4' });
    res.setHeader('Content-Disposition', 'attachment; filename=report-card.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Error generating PDF');
  }
};
module.exports = {
  gradeSetup,
  examReports,
  examCaSetup
};
//# sourceMappingURL=grades.js.map