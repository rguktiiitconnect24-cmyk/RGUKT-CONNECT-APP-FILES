const fs = require('fs');
let content = fs.readFileSync('c:/Users/bilij/Documents/projects/iiit/src/pages/Admin/AdminDashboard.jsx', 'utf8');

const idx = content.indexOf('import React from \\'react\\';', 100);
if (idx !== -1) {
    content = content.substring(0, idx) + `                                            </span>
                                        </td>
                                        <td>{complaint.createdAt ? new Date(complaint.createdAt.toDate ? complaint.createdAt.toDate() : complaint.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                                {recentComplaints.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-8 text-[var(--color-text-muted)]">No recent complaints.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
    );
};

export default AdminDashboard;
`;
    fs.writeFileSync('c:/Users/bilij/Documents/projects/iiit/src/pages/Admin/AdminDashboard.jsx', content);
    console.log('Fixed file');
} else {
    console.log('Duplicate import not found, might have already been fixed.');
}
