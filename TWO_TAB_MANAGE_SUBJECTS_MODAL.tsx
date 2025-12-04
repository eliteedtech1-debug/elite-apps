/* === CLEAN TWO-TAB MANAGE SUBJECTS MODAL === */
/* Replace lines 1500-1670 in subjects.tsx with this code */

{/* === MANAGE SUBJECTS MODAL === */}
<Modal
  title={`Manage Subjects for ${activeClass?.class_name}`}
  open={isManageModalVisible}
  onCancel={() => {
    setIsManageModalVisible(false);
    setActiveClass(null);
    if (hasClassStream) {
      setSelectedSubjectsMap({});
    } else {
      setSelectedSubjectsFlat([]);
    }
    resetCustomSubjects();
  }}
  onOk={handleManageSubjects}
  width={1000}
  okText="Save Changes"
  cancelText="Cancel"
>
  {activeClass && (
    <Tabs defaultActiveKey="assigned" type="card">
      {/* ========== TAB 1: CURRENTLY ASSIGNED SUBJECTS ========== */}
      <Tabs.TabPane tab="Currently Assigned" key="assigned">
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: '#666', marginBottom: 16 }}>
            All subjects currently assigned to this class. Edit, deactivate, or delete any subject.
          </p>
        </div>
        <Table
          dataSource={subjects
            .filter(s => s.class_code === activeClass.class_code && s.status === 'Active')
            .map(s => {
              const isEditing = editingAssignedSubject === s.subject_code;
              return {
                key: s.subject_code,
                subject: s.subject,
                originalName: s.subject,
                type: s.type || 'Core',
                status: s.status,
                isEditing,
                subjectCode: s.subject_code,
              };
            })}
          columns={[
            {
              title: 'Subject',
              dataIndex: 'subject',
              key: 'subject',
              render: (_: any, r: any) => {
                if (r.isEditing) {
                  return (
                    <Input
                      value={editAssignedSubjectName}
                      onChange={(e) => setEditAssignedSubjectName(e.target.value)}
                      size="small"
                      placeholder="Subject name"
                    />
                  );
                }
                return <strong style={{ fontSize: 14 }}>{r.subject}</strong>;
              }
            },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              width: 150,
              render: (_: any, r: any) => {
                if (r.isEditing) {
                  return (
                    <Select
                      value={editAssignedSubjectType}
                      onChange={setEditAssignedSubjectType}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {['Core','Science','Arts','Commercial','Technical','Vocational','Selective'].map(t => (
                        <Select.Option key={t} value={t}>{t}</Select.Option>
                      ))}
                    </Select>
                  );
                }
                return <Tag color="blue">{r.type}</Tag>;
              }
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 130,
              render: (_: any, r: any) => {
                if (r.isEditing) {
                  return (
                    <Select
                      value={editAssignedSubjectStatus}
                      onChange={setEditAssignedSubjectStatus}
                      size="small"
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="Active">
                        <span style={{ color: '#52c41a' }}>● Active</span>
                      </Select.Option>
                      <Select.Option value="Inactive">
                        <span style={{ color: '#faad14' }}>● Inactive</span>
                      </Select.Option>
                    </Select>
                  );
                }
                return <Tag color="success">Active</Tag>;
              }
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 100,
              render: (_: any, r: any) => {
                if (r.isEditing) {
                  return (
                    <Space size="small">
                      <Button
                        icon={<CheckOutlined />}
                        size="small"
                        type="primary"
                        onClick={() => saveAssignedSubjectEdit()}
                      />
                      <Button
                        icon={<CloseOutlined />}
                        size="small"
                        onClick={() => cancelAssignedSubjectEdit()}
                      />
                    </Space>
                  );
                }
                return (
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'edit',
                          label: 'Edit',
                          icon: <EditOutlined />,
                          onClick: () => startEditingAssignedSubject(r.subjectCode, r.subject, r.type)
                        },
                        {
                          key: 'toggle',
                          label: 'Deactivate',
                          icon: <EyeInvisibleOutlined />,
                          onClick: () => handleToggleSubjectStatus(r.subjectCode, r.status)
                        },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => deleteAssignedSubject(r.subjectCode)
                        }
                      ]
                    }}
                    trigger={['click']}
                  >
                    <Button size="small" icon={<MoreOutlined />} type="text" />
                  </Dropdown>
                );
              }
            }
          ]}
          Selection={false}
          withSearch={true}
          withPagination={true}
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          size="small"
        />
      </Tabs.TabPane>

      {/* ========== TAB 2: ADD MORE SUBJECTS ========== */}
      <Tabs.TabPane tab="Add More Subjects" key="add">
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Select pre-defined subjects or add custom subjects to assign to this class.
          </p>
        </div>

        {/* Pre-defined Subjects Table */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
            📚 Available Pre-defined Subjects
          </h4>
          <Table
            dataSource={getSubjectsForClass(activeClass)
              .filter(s => {
                const displayName = getDisplayName(s.name);
                // Filter out subjects already assigned and active
                const existing = subjects.find(x =>
                  x.class_code === activeClass.class_code &&
                  x.subject.toLowerCase() === displayName.toLowerCase() &&
                  x.status === 'Active'
                );
                return !existing; // Only show unassigned subjects
              })
              .map(s => {
                const displayName = getDisplayName(s.name);
                const displayType = getDisplayType(s.name, s.type);
                const isSelected = selectedSubjectsFlat.includes(s.name);
                return {
                  key: s.name,
                  subject: displayName,
                  originalName: s.name,
                  type: displayType,
                  isSelected,
                };
              })}
            columns={[
              {
                title: '',
                key: 'checkbox',
                width: 50,
                render: (_: any, r: any) => (
                  <Checkbox
                    checked={r.isSelected}
                    onChange={(e) => handleSelectionChange(r.originalName, e.target.checked)}
                  />
                ),
              },
              {
                title: 'Subject',
                dataIndex: 'subject',
                key: 'subject',
                render: (text: string) => <strong style={{ fontSize: 14 }}>{text}</strong>
              },
              {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
                width: 150,
                render: (type: string) => <Tag color="blue">{type}</Tag>
              }
            ]}
            Selection={false}
            withSearch={true}
            withPagination={true}
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            size="small"
          />
        </div>

        {/* Custom Subject Form */}
        <div style={{
          marginTop: 24,
          padding: 20,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#fff' }}>
            ➕ Add Custom Subject
          </h4>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12}>
              <Input
                placeholder="Enter custom subject name"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                onPressEnter={addCustomSubject}
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6}>
              <Select
                value={customSubjectType}
                onChange={setCustomSubjectType}
                style={{ width: '100%', borderRadius: 8 }}
                size="large"
              >
                {['Core','Science','Arts','Commercial','Technical','Vocational','Selective'].map(t => (
                  <Select.Option key={t} value={t}>{t}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6} lg={6}>
              <Button
                type="primary"
                onClick={addCustomSubject}
                block
                size="large"
                style={{ borderRadius: 8, background: '#fff', color: '#667eea', borderColor: '#fff', fontWeight: 600 }}
              >
                <PlusOutlined /> Add Subject
              </Button>
            </Col>
          </Row>
          {customSubjects.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ marginBottom: 12, color: '#fff', fontWeight: 500 }}>
                Custom subjects to be added ({customSubjects.length}):
              </p>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8 }}>
                {customSubjects.map(s => (
                  <Tag
                    key={s.name}
                    closable
                    onClose={() => removeCustomSubject(s.name)}
                    color="green"
                    style={{
                      marginRight: 8,
                      marginBottom: 8,
                      fontSize: 14,
                      padding: '6px 12px',
                      borderRadius: 6
                    }}
                  >
                    {s.name} <Tag color="blue" style={{ marginLeft: 6 }}>{s.type}</Tag>
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </Tabs.TabPane>
    </Tabs>
  )}
</Modal>
